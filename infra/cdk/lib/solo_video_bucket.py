"""Private S3 bucket + CloudFront playback + App Runner role for solo/challenge recordings.

Browser uploads via presigned S3 PUT or multipart UploadPart (never through App Runner bodies).
Playback uses CloudFront in front of the same bucket origin (optional trusted key groups for signed URLs).
"""

from __future__ import annotations

from aws_cdk import (
    CfnOutput,
    Duration,
    RemovalPolicy,
    Stack,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_iam as iam,
    aws_s3 as s3,
)
from constructs import Construct


class SoloVideoBucketConstruct(Construct):
    """
    Ephemeral videos (solo ``solo/*``, challenge ``challenge/*`` share this bucket via ``AWS_S3_BUCKET``).
    """

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        environment: str,
        cors_allowed_origins: list[str],
    ) -> None:
        super().__init__(scope, construct_id)

        is_prod = environment == "prod"

        self.bucket = s3.Bucket(
            self,
            "Bucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.S3_MANAGED,
            enforce_ssl=True,
            removal_policy=RemovalPolicy.RETAIN if is_prod else RemovalPolicy.DESTROY,
            auto_delete_objects=not is_prod,
            lifecycle_rules=[
                s3.LifecycleRule(
                    id="abort-incomplete-mpu",
                    abort_incomplete_multipart_upload_after=Duration.days(3),
                ),
            ],
        )

        self.bucket.add_cors_rule(
            allowed_methods=[
                s3.HttpMethods.GET,
                s3.HttpMethods.HEAD,
                s3.HttpMethods.PUT,
            ],
            allowed_origins=cors_allowed_origins,
            allowed_headers=["*"],
            exposed_headers=["ETag", "Content-Length"],
            max_age=3000,
        )

        self.instance_role = iam.Role(
            self,
            "AppRunnerSoloVideoRole",
            assumed_by=iam.ServicePrincipal("tasks.apprunner.amazonaws.com"),
            description=f"Pushup API - session video S3 ({environment})",
        )

        object_arns = [
            self.bucket.arn_for_objects("solo/*"),
            self.bucket.arn_for_objects("challenge/*"),
        ]
        mp_actions = [
            "s3:PutObject",
            "s3:GetObject",
            "s3:DeleteObject",
            "s3:HeadObject",
            "s3:CreateMultipartUpload",
            "s3:UploadPart",
            "s3:CompleteMultipartUpload",
            "s3:AbortMultipartUpload",
            "s3:ListMultipartUploadParts",
        ]
        self.instance_role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=mp_actions,
                resources=object_arns,
            )
        )

        # CloudFront pulls objects through OAC — viewers never hit raw S3 for reads.
        oac = cloudfront.CfnOriginAccessControl(self, "VideoOAC",
            origin_access_control_config=cloudfront.CfnOriginAccessControl.OriginAccessControlConfigProperty(
                name="video-oac",
                origin_access_control_origin_type="s3",
                signing_behavior="always",   # replaces OriginAccessControlSigning.V4
                signing_protocol="sigv4",
                description="OAC for session video bucket"
    )
)

        origin = origins.S3BucketOrigin.with_origin_access_control(self.bucket, origin_access_control=oac)

        _VALID_PEM_PREFIXES = (
            "-----BEGIN PUBLIC KEY-----",
            "-----BEGIN RSA PUBLIC KEY-----",
        )
        raw = Stack.of(self).node.try_get_context("soloVideoSigningPublicKeyPem")
        vk_pem_clean = (str(raw).strip() if raw is not None else "") or ""
        if vk_pem_clean and not vk_pem_clean.startswith(_VALID_PEM_PREFIXES):
            raise ValueError(
                "CDK context soloVideoSigningPublicKeyPem is non-empty but is not a valid PEM public key "
                "(must start with '-----BEGIN PUBLIC KEY-----' or '-----BEGIN RSA PUBLIC KEY-----', "
                "or omit/empty the context for unsigned playback). "
                "Refusing to synthesize a distribution without trusted key groups when a key was provided."
            )

        trusted: list[cloudfront.IKeyGroup] = []

        pk: cloudfront.IPublicKey | None = None
        if vk_pem_clean.startswith(_VALID_PEM_PREFIXES):
            pk = cloudfront.PublicKey(
                self,
                "VideoCfSigningPk",
                encoded_key=vk_pem_clean,
            )
            trusted.append(
                cloudfront.KeyGroup(
                    self,
                    "VideoCfKeyGroup",
                    items=[pk],
                    key_group_name=f"pushup-video-{environment}-kg",
                )
            )

        # Match Managed-CachingOptimized TTL + compression; add CORS headers to the cache key so
        # simple GETs and OPTIONS preflights never share one cached object across different origins.
        playback_cache_policy = cloudfront.CachePolicy(
            self,
            "VideoPlaybackCachePolicy",
            comment=f"Video playback — CORS-vary cache key ({environment})",
            default_ttl=Duration.seconds(86_400),
            min_ttl=Duration.seconds(1),
            max_ttl=Duration.seconds(31_536_000),
            cookie_behavior=cloudfront.CacheCookieBehavior.none(),
            header_behavior=cloudfront.CacheHeaderBehavior.allow_list(
                "Origin",
                "Access-Control-Request-Method",
                "Access-Control-Request-Headers",
            ),
            query_string_behavior=cloudfront.CacheQueryStringBehavior.none(),
            enable_accept_encoding_gzip=True,
            enable_accept_encoding_brotli=True,
        )

        self.distribution = cloudfront.Distribution(
            self,
            "PlaybackDistribution",
            comment=f"Pushup session video playback ({environment})",
            enabled=True,
            price_class=cloudfront.PriceClass.PRICE_CLASS_100,
            default_behavior=cloudfront.BehaviorOptions(
                origin=origin,
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                compress=True,
                allowed_methods=cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                cached_methods=cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
                cache_policy=playback_cache_policy,
                origin_request_policy=cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
                trusted_key_groups=trusted if trusted else None,
            ),
        )

        CfnOutput(
            self,
            "SoloVideoBucketName",
            value=self.bucket.bucket_name,
            description=f"Session video bucket ({environment}) - set AWS_S3_BUCKET",
        )
        CfnOutput(
            self,
            "SoloVideoInstanceRoleArn",
            value=self.instance_role.role_arn,
            description=f"S3 instance role ARN ({environment}) for App Runner",
        )
        CfnOutput(
            self,
            "SoloVideoCloudFrontDomainName",
            value=self.distribution.distribution_domain_name,
            description=(
                "Set CLOUDFRONT_VIDEO_DOMAIN to this hostname (no https:// scheme) "
                "and configure signing keys when Trusted Key Groups are attached."
            ),
        )
        CfnOutput(
            self,
            "SoloVideoCloudFrontDistributionId",
            value=self.distribution.distribution_id,
            description="Playback CloudFront distribution id",
        )

        if pk:
            CfnOutput(
                self,
                "SoloVideoCloudFrontKeyPairId",
                value=pk.public_key_id,
                description="Set CLOUDFRONT_VIDEO_KEY_PAIR_ID when signed URLs enabled",
            )

        if not vk_pem_clean:
            from aws_cdk import Annotations

            Annotations.of(self).add_info(
                "soloVideoSigningPublicKeyPem CDK context is empty — playback distribution accepts unsigned viewers. "
                "If set, the value must be PEM starting with '-----BEGIN PUBLIC KEY-----' or "
                "'-----BEGIN RSA PUBLIC KEY-----' (otherwise synthesis fails). "
                "For production signed URLs pass the PEM-backed cloudfront_rsa_public_key.pem from openssl."
            )
