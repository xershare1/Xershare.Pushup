"""ACM certificate in us-east-1 for CloudFront (required region)."""

from __future__ import annotations

import os

from aws_cdk import CfnOutput, Stack
from aws_cdk import aws_certificatemanager as acm
from constructs import Construct


class AcmStack(Stack):
    """Certificate for pushuppros.com and subdomains. Deploy to us-east-1."""

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        cert = acm.Certificate(
            self,
            "Certificate",
            domain_name="pushuppros.com",
            subject_alternative_names=[
                "*.pushuppros.com",
                "*.dev.pushuppros.com",
            ],
            validation=acm.CertificateValidation.from_dns(),
        )

        CfnOutput(
            self,
            "CertificateArn",
            value=cert.certificate_arn,
            description="ACM cert ARN — use in CloudFront stacks (us-east-2)",
        )
