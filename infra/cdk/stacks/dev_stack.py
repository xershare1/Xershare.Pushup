from aws_cdk import Stack
from constructs import Construct

from lib.pushup_apprunner_service import PushupApprunnerService


class DevStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        existing_arn = self.node.try_get_context("existingAppRunnerServiceArnDev")
        existing_url = self.node.try_get_context("existingAppRunnerServiceUrlDev")

        PushupApprunnerService(
            self,
            "PushupApi",
            service_name="pushup-api-dev",
            branch="develop",
            existing_service_arn=existing_arn,
            existing_service_url=existing_url,
        )
