"""Public API endpoints for Project CRUD operations."""
import secrets
from logging import getLogger

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.models.projects import (
    ProjectCreate,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdate,
)
from app.db.models.projects import Project
from app.db.storage.project_repository import ProjectRepository
from app.server.auth_middleware import get_current_user_id
from app.server.exceptions import NotFoundError
from app.server.project_access import verify_project_id_path

logger = getLogger(__name__)

router = APIRouter(prefix="", tags=["projects"])


def _generate_id() -> str:
    """Generate a random hexadecimal ID."""
    return secrets.token_hex(4)


@router.post(
    "/projects",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a project",
)
def create_project(
    project_data: ProjectCreate,
    user_id: str = Depends(get_current_user_id),
) -> ProjectResponse:
    """Create a new project."""
    try:
        repo = ProjectRepository()
        
        # Generate ID
        project_id = _generate_id()
        
        # Create project model
        project = Project(
            id=project_id,
            name=project_data.name,
            description=project_data.description,
            owner_id=user_id,
        )
        
        created = repo.create(project)
        
        return ProjectResponse.model_validate(created.model_dump())
    except Exception as e:
        logger.exception(f"Error creating project: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create project: {str(e)}"
        )


@router.get(
    "/projects",
    response_model=ProjectListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all projects for the current user",
)
def list_projects(
    user_id: str = Depends(get_current_user_id),
) -> ProjectListResponse:
    """List all projects accessible by the current user."""
    try:
        repo = ProjectRepository()
        projects = repo.list_by_user(user_id)
        
        return ProjectListResponse(
            projects=[ProjectResponse.model_validate(p.model_dump()) for p in projects]
        )
    except Exception as e:
        logger.exception(f"Error listing projects: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list projects: {str(e)}"
        )


@router.get(
    "/projects/{project_id}",
    response_model=ProjectResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a project",
)
def get_project(
    project_id: str = Depends(verify_project_id_path),
) -> ProjectResponse:
    """Get a project by ID."""
    try:
        from app.server.project_access import verify_project_id_path

        repo = ProjectRepository()
        project = repo.get_by_id(project_id)
        
        return ProjectResponse.model_validate(project.model_dump())
    except HTTPException:
        raise
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except Exception as e:
        logger.exception(f"Error getting project: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get project: {str(e)}"
        )


@router.patch(
    "/projects/{project_id}",
    response_model=ProjectResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a project",
)
def update_project(
    project_data: ProjectUpdate,
    project_id: str = Depends(verify_project_id_path),
) -> ProjectResponse:
    """Update a project."""
    try:
        repo = ProjectRepository()
        
        # Prepare update data (only include provided fields)
        update_data = {}
        if project_data.name is not None:
            update_data["name"] = project_data.name
        if project_data.description is not None:
            update_data["description"] = project_data.description
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        updated = repo.update(project_id, update_data)
        
        return ProjectResponse.model_validate(updated.model_dump())
    except HTTPException:
        raise
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except Exception as e:
        logger.exception(f"Error updating project: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update project: {str(e)}"
        )


@router.delete(
    "/projects/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a project",
)
def delete_project(
    project_id: str = Depends(verify_project_id_path),
) -> None:
    """Delete a project."""
    try:
        repo = ProjectRepository()
        
        # Verify it exists
        repo.get_by_id(project_id)
        
        # Delete
        deleted = repo.delete(project_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with ID '{project_id}' not found"
            )
        
        return None
    except HTTPException:
        raise
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except Exception as e:
        logger.exception(f"Error deleting project: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete project: {str(e)}"
        )

