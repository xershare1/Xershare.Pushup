"""Private S3 bucket + App Runner instance role for solo session video (PUT/GET/DELETE solo/*)."""

from __future__ import annotations

from aws_cdk import CfnOutput, RemovalPolicy, aws_iam as iam, aws_s3 as s3
from constructs import Construct


class SoloVideoBucketConstruct(Construct):
    """
    Ephemeral solo session uploads (see backend ``solo/{user_id}/{session_id}.mp4``).
    Not for static site hosting — block public access; API uses instance role + boto3.
    """

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        environment: str,
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
        )

        self.instance_role = iam.Role(
            self,
            "AppRunnerSoloVideoRole",
            assumed_by=iam.ServicePrincipal("tasks.apprunner.amazonaws.com"),
            description=f"Pushup API - solo session video S3 access ({environment})",
        )

        self.instance_role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    "s3:PutObject",
                    "s3:GetObject",
                    "s3:DeleteObject",
                ],
                resources=[self.bucket.arn_for_objects("solo/*")],
            )
        )

        CfnOutput(
            self,
            "SoloVideoBucketName",
            value=self.bucket.bucket_name,
            description=f"Solo session video bucket ({environment}) - set AWS_S3_BUCKET on App Runner",
        )
        CfnOutput(
            self,
            "SoloVideoInstanceRoleArn",
            value=self.instance_role.role_arn,
            description=f"Attach to App Runner as instance role ({environment}) if not set automatically",
        )
