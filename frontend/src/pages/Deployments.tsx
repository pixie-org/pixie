import { ComingSoon } from "@/components/ComingSoonModal";
import { Upload } from "lucide-react";

const Deployments = () => {
  return (
    <ComingSoon
      title="Deployments are coming soon!"
      description="Deployments are coming soon! We'll let you know when this feature is available."
      icon={Upload}
    />
  );
};

export default Deployments;

