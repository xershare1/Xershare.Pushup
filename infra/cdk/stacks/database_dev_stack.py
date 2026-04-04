from aws_cdk import RemovalPolicy, Stack
from constructs import Construct

from lib.pushup_postgres import PushupPostgres


class DatabaseDevStack(Stack):
    """RDS Postgres for dev (destroyable, no deletion protection)."""

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        PushupPostgres(
            self,
            "PushupPostgres",
            instance_identifier="pushup-db-dev",
            removal_policy=RemovalPolicy.DESTROY,
            deletion_protection=False,
            backup_retention_days=0,
        )
