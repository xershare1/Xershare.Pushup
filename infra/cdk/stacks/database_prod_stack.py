from aws_cdk import RemovalPolicy, Stack
from constructs import Construct

from lib.pushup_postgres import PushupPostgres


class DatabaseProdStack(Stack):
    """RDS Postgres for production."""

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        PushupPostgres(
            self,
            "PushupPostgres",
            instance_identifier="pushup-db-prod",
            removal_policy=RemovalPolicy.RETAIN,
            deletion_protection=True,
            backup_retention_days=7,
        )
