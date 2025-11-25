import { useSearchParams, useNavigate } from "react-router-dom";

type EndpointType = "mcp" | "api" | null;

const ImportTool = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const endpointTypeParam = searchParams.get("type") as EndpointType;

  if (!endpointTypeParam) {
    navigate("/tools");
    return null;
  }

  return <div>ImportTool</div>;
};

export default ImportTool;
