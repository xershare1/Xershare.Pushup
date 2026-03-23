"""Marketing site: S3 + CloudFront + custom domain for dev or prod."""

from __future__ import annotations

from pathlib import Path

from aws_cdk import Annotations, CfnOutput, Duration, RemovalPolicy, Stack
from aws_cdk import aws_cloudfront as cloudfront
from aws_cdk import aws_cloudfront_origins as origins
from aws_cdk import aws_route53 as route53
from aws_cdk import aws_route53_targets as targets
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_s3_deployment as s3_deploy
from aws_cdk import aws_certificatemanager as acm
from constructs import Construct


_PLACEHOLDER_CERT_ARN = "arn:aws:acm:us-east-1:123456789012:certificate/00000000-0000-0000-0000-000000000000"


def _context_or_placeholder(scope: Construct, key: str, placeholder: str, desc: str) -> str:
    value = Stack.of(scope).node.try_get_context(key)
    if value is None or str(value).strip() == "":
        Annotations.of(Stack.of(scope)).add_warning(
            f"Context '{key}' not set — using placeholder. {desc} "
            f"Pass -c {key}=<arn> before deploy."
        )
        return placeholder
    return str(value).strip()


class MarketingStack(Stack):
    """S3 + CloudFront for marketing site. Deploys from ../../marketing/dist."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        environment: str,
        domain: str,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        cert_arn = _context_or_placeholder(
            self,
            "certificateArn",
            _PLACEHOLDER_CERT_ARN,
            "Deploy PushupProsAcm in us-east-1 first.",
        )
        cert = acm.Certificate.from_certificate_arn(
            self, "Cert", certificate_arn=cert_arn
        )

        bucket = s3.Bucket(
            self,
            "Bucket",
            bucket_name=f"pushuppros-marketing-{environment}",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            encryption=s3.BucketEncryption.S3_MANAGED,
            removal_policy=RemovalPolicy.RETAIN,
            enforce_ssl=True,
        )

        origin = origins.S3BucketOrigin.with_origin_access_control(bucket)

        distribution = cloudfront.Distribution(
            self,
            "Distribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origin,
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowed_methods=cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                cached_methods=cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
                compress=True,
            ),
            default_root_object="index.html",
            domain_names=[domain],
            certificate=cert,
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=404,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=Duration.minutes(0),
                ),
                cloudfront.ErrorResponse(
                    http_status=403,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=Duration.minutes(0),
                ),
            ],
        )

        dist_dir = Path(__file__).parent.parent.parent.parent / "marketing" / "dist"
        if not dist_dir.exists():
            Annotations.of(self).add_warning(
                f"marketing/dist not found. Run 'cd marketing && npm run build' before deploy."
            )
        else:
            s3_deploy.BucketDeployment(
                self,
                "Deploy",
                sources=[s3_deploy.Source.asset(str(dist_dir))],
                destination_bucket=bucket,
                distribution=distribution,
                distribution_paths=["/*"],
            )

        zone = route53.HostedZone.from_lookup(
            self, "Zone", domain_name="pushuppros.com"
        )
        record_name = "" if domain == "pushuppros.com" else domain.replace(".pushuppros.com", "")
        route53.ARecord(
            self,
            "Alias",
            zone=zone,
            record_name=record_name,
            target=route53.RecordTarget.from_alias(
                targets.CloudFrontTarget(distribution)
            ),
        )

        CfnOutput(self, "BucketName", value=bucket.bucket_name)
        CfnOutput(self, "DistributionId", value=distribution.distribution_id)
        CfnOutput(self, "DomainName", value=distribution.distribution_domain_name)
        CfnOutput(self, "SiteUrl", value=f"https://{domain}", description="Marketing site URL")
