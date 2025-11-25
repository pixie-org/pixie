import { useSearchParams, useNavigate } from "react-router-dom";
import CreateMcpToolSource from "./CreateMcpToolSource";
import CreateOpenAPIToolSource from "./CreateOpenAPIToolSource";

type ToolSourceType = "mcp" | "api" | null;

const CreateToolSource = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toolSourceTypeParam = searchParams.get("type") as ToolSourceType;

  if (!toolSourceTypeParam) {
    navigate("/toolkit-sources");
    return null;
  }

  if (toolSourceTypeParam === "mcp") {
    return <CreateMcpToolSource />;
  }

  if (toolSourceTypeParam === "api") {
    return <CreateOpenAPIToolSource />;
  }

  return null;
};

export default CreateToolSource;
