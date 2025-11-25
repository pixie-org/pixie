#!/usr/bin/env python3
"""
Simple script to run create_deployment function.

Usage:
    python run_deployment.py
"""
import logging
import sys
from pathlib import Path

# Load environment variables (.env.local first, then .env)
from app.server.config import load_env_files

load_env_files()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import after environment is loaded
from app.api.utils.widget_deployment import create_deployment
from deploy.enums import WidgetServerTypeEnum


def main():
    """Run the deployment."""
    widget_id = 'f669a4ad'
    server_type = WidgetServerTypeEnum.OPENAI
    
    logger.info(f"Starting deployment for widget: {widget_id}")
    logger.info(f"Server type: {server_type.value}")
    
    try:
        deployment_url, deployment_type = create_deployment(widget_id, server_type=server_type)
        logger.info("=" * 60)
        logger.info("DEPLOYMENT SUCCESSFUL")
        logger.info("=" * 60)
        logger.info(f"Deployment URL: {deployment_url}")
        logger.info(f"Deployment Type: {deployment_type.value}")
        logger.info("=" * 60)
        return 0
    except Exception as e:
        logger.error(f"Deployment failed: {e}", exc_info=True)
        return 1

if __name__ == "__main__":
    sys.exit(main())

