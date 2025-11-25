import { ComingSoon } from "@/components/ComingSoonModal";
import { Upload } from "lucide-react";

const EnvVariables = () => {
  return (
    <ComingSoon
      title="Environments are coming soon!"
      description="Environments are coming soon! We'll let you know when this feature is available."
      icon={Upload}
    />
  );
};

export default EnvVariables;
