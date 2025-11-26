"""Public API endpoints for Design upload operations."""
import secrets
from logging import getLogger

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status

from app.api.models.designs import (
    DesignListPaginatedResponse,
    DesignListResponse,
    DesignResponse,
)
from app.db.models.designs import Design, DesignTypeEnum
from app.db.storage.design_repository import DesignRepository
from app.server.exceptions import NotFoundError
from app.server.project_access import verify_project_id_path

logger = getLogger(__name__)

router = APIRouter(prefix="/projects/{project_id}", tags=["designs"])


def _generate_id() -> str:
    """Generate a random hexadecimal ID."""
    return secrets.token_hex(4)


@router.post(
    "/designs/logo",
    response_model=DesignResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a logo design",
)
async def upload_logo(
    file: UploadFile = File(...),
    project_id: str = Depends(verify_project_id_path),
) -> DesignResponse:
    """
    Upload a logo design file.
    
    Accepts image files (PNG, JPEG, SVG, etc.) and stores them in the database.
    """
    try:
        # Validate file type (basic check - can be enhanced)
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image. Supported formats: PNG, JPEG, SVG, etc."
            )
        
        # Read file data
        file_data = await file.read()
        file_size = len(file_data)
        
        # Validate file size (e.g., max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        if file_size > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum allowed size of {max_size / (1024 * 1024)}MB"
            )
        
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is empty"
            )
        
        # Generate ID
        design_id = _generate_id()
        
        # Create design model
        design = Design(
            id=design_id,
            design_type=DesignTypeEnum.LOGO,
            filename=file.filename or "logo",
            content_type=file.content_type or "application/octet-stream",
            file_data=file_data,
            file_size=file_size,
            project_id=project_id,
        )
        
        # Save to database
        repo = DesignRepository()
        created = repo.create(design)
        
        # Return response without file_data (to avoid sending large binary data)
        response_data = created.model_dump(exclude={"file_data"})
        return DesignResponse.model_validate(response_data)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error uploading logo: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload logo: {str(e)}"
        )


@router.post(
    "/designs/ux-design",
    response_model=DesignResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a UX design file",
)
async def upload_ux_design(
    file: UploadFile = File(...),
    project_id: str = Depends(verify_project_id_path),
) -> DesignResponse:
    """
    Upload a UX design file.
    
    Accepts design files (PNG, JPEG, PDF, Figma files, etc.) and stores them in the database.
    """
    try:
        # Validate file type (basic check - can be enhanced)
        allowed_content_types = [
            "image/",
            "application/pdf",
            "application/octet-stream",  # For Figma files, etc.
        ]
        
        if not file.content_type or not any(
            file.content_type.startswith(prefix) for prefix in allowed_content_types
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be a design file. Supported formats: PNG, JPEG, PDF, Figma files, etc."
            )
        
        # Read file data
        file_data = await file.read()
        file_size = len(file_data)
        
        # Validate file size (e.g., max 50MB for UX designs)
        max_size = 50 * 1024 * 1024  # 50MB
        if file_size > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum allowed size of {max_size / (1024 * 1024)}MB"
            )
        
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is empty"
            )
        
        # Generate ID
        design_id = _generate_id()
        
        # Create design model
        design = Design(
            id=design_id,
            design_type=DesignTypeEnum.UX_DESIGN,
            filename=file.filename or "ux_design",
            content_type=file.content_type or "application/octet-stream",
            file_data=file_data,
            file_size=file_size,
            project_id=project_id,
        )
        
        # Save to database
        repo = DesignRepository()
        created = repo.create(design)
        
        # Return response without file_data (to avoid sending large binary data)
        response_data = created.model_dump(exclude={"file_data"})
        return DesignResponse.model_validate(response_data)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error uploading UX design: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload UX design: {str(e)}"
        )


@router.get(
    "/designs",
    response_model=DesignListPaginatedResponse,
    status_code=status.HTTP_200_OK,
    summary="List designs (paginated)",
)
def list_designs(
    project_id: str = Depends(verify_project_id_path),
    limit: int = 20,
    offset: int = 0,
    design_type: DesignTypeEnum | None = None,
) -> DesignListPaginatedResponse:
    """
    List designs with pagination.
    
    - **limit**: Number of items per page (default: 20, max: 100)
    - **offset**: Number of items to skip (default: 0)
    - **design_type**: Optional filter by design type (logo or ux_design)
    """
    try:
        # Validate limit
        if limit < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="limit must be greater than 0"
            )
        if limit > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="limit cannot exceed 100"
            )
        
        # Validate offset
        if offset < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="offset must be greater than or equal to 0"
            )
        
        repo = DesignRepository()
        
        # Get paginated designs
        designs = repo.list_paginated(project_id=project_id, design_type=design_type, limit=limit, offset=offset)
        
        # Get total count
        total = repo.count(design_type=design_type, project_id=project_id)
        
        # Build response items (exclude file_data)
        items = []
        for design in designs:
            design_data = design.model_dump(exclude={"file_data"})
            items.append(DesignListResponse.model_validate(design_data))
        
        # Calculate pagination metadata
        has_next = (offset + limit) < total
        has_prev = offset > 0
        
        return DesignListPaginatedResponse(
            items=items,
            total=total,
            limit=limit,
            offset=offset,
            has_next=has_next,
            has_prev=has_prev,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error listing designs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list designs: {str(e)}"
        )


@router.get(
    "/designs/{design_id}",
    response_model=DesignResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a design",
)
def get_design(
    design_id: str,
    project_id: str = Depends(verify_project_id_path),
) -> DesignResponse:
    """Get a design by ID (metadata only, without file data)."""
    try:
        
        repo = DesignRepository()
        design = repo.get_by_id(design_id, project_id=project_id)
        
        # Return response without file_data
        response_data = design.model_dump(exclude={"file_data"})
        return DesignResponse.model_validate(response_data)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except Exception as e:
        logger.exception(f"Error getting design: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get design: {str(e)}"
        )


@router.get(
    "/designs/{design_id}/download",
    status_code=status.HTTP_200_OK,
    summary="Download a design file",
)
def download_design(
    design_id: str,
    project_id: str = Depends(verify_project_id_path),
):
    """
    Download a design file by ID.
    
    Returns the actual file data.
    """
    try:
        from fastapi.responses import Response
        
        repo = DesignRepository()
        design = repo.get_by_id(design_id, project_id=project_id)
        
        return Response(
            content=design.file_data,
            media_type=design.content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{design.filename}"',
                "Content-Length": str(design.file_size),
            }
        )
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except Exception as e:
        logger.exception(f"Error downloading design: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download design: {str(e)}"
        )


@router.delete(
    "/designs/{design_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a design",
)
def delete_design(
    design_id: str,
    project_id: str = Depends(verify_project_id_path),
) -> None:
    """Delete a design."""
    try:
        repo = DesignRepository()
        repo.get_by_id(design_id, project_id=project_id)
        
        deleted = repo.delete(design_id, project_id=project_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Design with ID '{design_id}' not found"
            )
        
        return None
    except HTTPException:
        raise
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e.detail))
    except Exception as e:
        logger.exception(f"Error deleting design: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete design: {str(e)}"
        )

