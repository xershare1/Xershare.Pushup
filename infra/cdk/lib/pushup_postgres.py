"""VPC + RDS PostgreSQL for Pushup API (Alembic / SQLAlchemy)."""

from __future__ import annotations

from aws_cdk import CfnOutput, Duration, RemovalPolicy
from aws_cdk import aws_ec2 as ec2
from aws_cdk import aws_rds as rds
from constructs import Construct

# Match backend driver: postgresql+psycopg://...
DB_NAME = "pushup"
DB_PORT = "5432"


class PushupPostgres(Construct):
    """
    Private RDS in a dedicated VPC (single NAT). RDS security group allows 5432
    from the VPC CIDR — tighten to an App Runner VPC connector SG when wiring the API.
    """

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        instance_identifier: str,
        removal_policy: RemovalPolicy,
        deletion_protection: bool,
        backup_retention_days: int = 7,
    ) -> None:
        super().__init__(scope, construct_id)

        self.vpc = ec2.Vpc(
            self,
            "Vpc",
            max_azs=2,
            nat_gateways=1,
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="Public",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24,
                ),
                ec2.SubnetConfiguration(
                    name="Private",
                    subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidr_mask=24,
                ),
            ],
        )

        db_sg = ec2.SecurityGroup(
            self,
            "RdsSg",
            vpc=self.vpc,
            description="Pushup Postgres",
            allow_all_outbound=True,
        )
        db_sg.add_ingress_rule(
            ec2.Peer.ipv4(self.vpc.vpc_cidr_block),
            ec2.Port.tcp(5432),
            "Postgres from VPC CIDR — replace with App Runner connector SG when wired",
        )

        # Prefer a concrete minor; adjust if your account/region deprecates it.
        pg_version = rds.PostgresEngineVersion.VER_16_4

        self.instance = rds.DatabaseInstance(
            self,
            "Postgres",
            engine=rds.DatabaseInstanceEngine.postgres(version=pg_version),
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.T4G,
                ec2.InstanceSize.MICRO,
            ),
            vpc=self.vpc,
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
            ),
            security_groups=[db_sg],
            credentials=rds.Credentials.from_generated_secret("pushupadmin"),
            database_name=DB_NAME,
            allocated_storage=20,
            storage_type=rds.StorageType.GP3,
            storage_encrypted=True,
            backup_retention=Duration.days(backup_retention_days),
            deletion_protection=deletion_protection,
            removal_policy=removal_policy,
        )

        CfnOutput(
            self,
            "DatabaseEndpoint",
            value=self.instance.instance_endpoint.hostname,
            description="RDS hostname for DATABASE_URL",
        )
        CfnOutput(
            self,
            "DatabasePort",
            value=DB_PORT,
        )
        CfnOutput(
            self,
            "DatabaseName",
            value=DB_NAME,
        )
        CfnOutput(
            self,
            "DatabaseSecretArn",
            value=self.instance.secret.secret_arn,
            description="Secrets Manager ARN (username/password JSON)",
        )
        CfnOutput(
            self,
            "DatabaseMasterUsername",
            value="pushupadmin",
            description="Master user (password is only in the secret)",
        )
        CfnOutput(
            self,
            "VpcId",
            value=self.vpc.vpc_id,
            description="For App Runner VPC connector",
        )
