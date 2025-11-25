import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const MCP = () => {
  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Server Configuration</CardTitle>
            <CardDescription>Basic MCP server settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="server-name">Server Name</Label>
              <Input id="server-name" placeholder="My MCP Server" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="server-port">Port</Label>
              <Input id="server-port" type="number" placeholder="3000" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-start">Auto-start on Boot</Label>
              <Switch id="auto-start" />
            </div>
            <Button className="w-full">Start Server</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connection Settings</CardTitle>
            <CardDescription>Configure client connections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="max-conn">Max Connections</Label>
              <Input id="max-conn" type="number" placeholder="100" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeout">Connection Timeout (ms)</Label>
              <Input id="timeout" type="number" placeholder="5000" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="ssl">Enable SSL/TLS</Label>
              <Switch id="ssl" defaultChecked />
            </div>
            <Button variant="secondary" className="w-full">
              Apply Settings
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Tool Registration</CardTitle>
            <CardDescription>Register tools with the MCP server</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tool-id">Tool ID</Label>
                <Input id="tool-id" placeholder="my-tool" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tool-version">Version</Label>
                <Input id="tool-version" placeholder="1.0.0" />
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button className="w-full">Register Tool</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MCP;
