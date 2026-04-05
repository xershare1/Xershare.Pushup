from aws_cdk import Stack
from constructs import Construct

from lib.pushup_apprunner_service import PushupApprunnerService
from lib.solo_video_bucket import SoloVideoBucketConstruct


class DevStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        solo = SoloVideoBucketConstruct(self, "SoloVideo", environment="dev")

        existing_arn = self.node.try_get_context("existingAppRunnerServiceArnDev")
        existing_url = self.node.try_get_context("existingAppRunnerServiceUrlDev")

        use_existing = bool(existing_arn and existing_url)

        PushupApprunnerService(
            self,
            "PushupApi",
            service_name="pushup-api-dev",
            branch="develop",
            existing_service_arn=existing_arn,
            existing_service_url=existing_url,
            instance_role_arn=None if use_existing else solo.instance_role.role_arn,
        )
