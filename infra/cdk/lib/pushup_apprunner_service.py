from __future__ import annotations

from typing import Optional

from aws_cdk import Annotations, CfnOutput, Stack, aws_apprunner as apprunner
from constructs import Construct

_PLACEHOLDER_CONNECTION_ARN = (
    "arn:aws:apprunner:us-east-2:794038211234:connection/Xershare_Connection/e39d2a4ae04747e699a6b0768589a59b"
)
_PLACEHOLDER_REPO_URL = "https://github.com/xershare1/Xershare.Pushup"


def _context_or_placeholder(scope: Construct, key: str, placeholder: str) -> str:
    value = Stack.of(scope).node.try_get_context(key)
    if value is None or str(value).strip() == "":
        Annotations.of(Stack.of(scope)).add_warning(
            f"Context '{key}' is not set — using a placeholder so synthesis works. "
            f"Set it before deploy (see README)."
        )
        return placeholder
    return str(value).strip()


class PushupApprunnerService(Construct):
    """App Runner service from GitHub using repo-root ``apprunner.yaml`` (``configuration_source=REPOSITORY``).
    When ``existing_service_arn`` and ``existing_service_url`` are provided, the construct references the
    existing service instead of creating a new one."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        service_name: str,
        branch: str,
        existing_service_arn: Optional[str] = None,
        existing_service_url: Optional[str] = None,
        instance_role_arn: Optional[str] = None,
    ) -> None:
        super().__init__(scope, construct_id)

        if existing_service_arn and existing_service_url:
            # Reference existing service — do not create
            CfnOutput(
                self,
                "ServiceUrl",
                value=existing_service_url,
                description=f"App Runner URL for existing {service_name}",
            )
            return

        connection_arn = _context_or_placeholder(
            self, "githubConnectionArn", _PLACEHOLDER_CONNECTION_ARN
        )
        repository_url = _context_or_placeholder(
            self, "githubRepositoryUrl", _PLACEHOLDER_REPO_URL
        )

        service_props: dict = dict(
            service_name=service_name,
            source_configuration=apprunner.CfnService.SourceConfigurationProperty(
                authentication_configuration=apprunner.CfnService.AuthenticationConfigurationProperty(
                    connection_arn=connection_arn,
                ),
                auto_deployments_enabled=True,
                code_repository=apprunner.CfnService.CodeRepositoryProperty(
                    repository_url=repository_url,
                    source_code_version=apprunner.CfnService.SourceCodeVersionProperty(
                        type="BRANCH",
                        value=branch,
                    ),
                    code_configuration=apprunner.CfnService.CodeConfigurationProperty(
                        configuration_source="REPOSITORY",
                    ),
                ),
            ),
            health_check_configuration=apprunner.CfnService.HealthCheckConfigurationProperty(
                path="/health",
                protocol="HTTP",
                interval=15,
                timeout=10,
                healthy_threshold=1,
                unhealthy_threshold=5,
            ),
            instance_configuration=apprunner.CfnService.InstanceConfigurationProperty(
                cpu="512",
                memory="1024",
                instance_role_arn=instance_role_arn,
            ),
        )

        service = apprunner.CfnService(self, "Service", **service_props)

        CfnOutput(
            self,
            "ServiceUrl",
            value=service.attr_service_url,
            description=f"App Runner URL for {service_name}",
        )
