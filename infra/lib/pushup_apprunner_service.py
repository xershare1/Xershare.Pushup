from __future__ import annotations

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
    """App Runner service from GitHub using the repo root ``Dockerfile`` + ``apprunner.yaml``."""

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        service_name: str,
        branch: str,
    ) -> None:
        super().__init__(scope, construct_id)

        connection_arn = _context_or_placeholder(
            self, "githubConnectionArn", _PLACEHOLDER_CONNECTION_ARN
        )
        repository_url = _context_or_placeholder(
            self, "githubRepositoryUrl", _PLACEHOLDER_REPO_URL
        )

        service = apprunner.CfnService(
            self,
            "Service",
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
                interval=10,
                timeout=5,
                healthy_threshold=1,
                unhealthy_threshold=5,
            ),
            instance_configuration=apprunner.CfnService.InstanceConfigurationProperty(
                cpu="256",
                memory="512",
            ),
        )

        CfnOutput(
            self,
            "ServiceUrl",
            value=service.attr_service_url,
            description=f"App Runner URL for {service_name}",
        )
