import { ComingSoon } from "@/components/ComingSoonModal";
import { Upload } from "lucide-react";

const Evaluate = () => {
  return (
    <ComingSoon
      title="Evaluations are coming soon!"
      description="Evaluations are coming soon! We'll let you know when this feature is available."
      icon={Upload}
    />
  );
};

export default Evaluate;
