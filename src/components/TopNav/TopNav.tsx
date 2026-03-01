import { Activity, EyeOff, Radio } from "lucide-react";
import Button from "../ui/button";

export default function TopNav() {
    return (
        <header className="col-span-1 lg:col-span-2 border-b flex justify-between items-center p-2">
            <div className="flex gap-2">
                <div className="flex gap-2">
                    <Activity />
                    <span>CAN Bus Analyzer</span>
                </div>
                <div className="flex gap-2">
                    <span>Live</span>
                </div>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" size="sm">
                    Record
                </Button>
                <Button variant="ghost" size="sm">
                    <Radio />
                    <span>Pause</span>
                </Button>
                <Button variant="destructive" size="sm">
                    <EyeOff />
                    <span>Show Hidden</span>
                </Button>
            </div>
        </header>
    );
}