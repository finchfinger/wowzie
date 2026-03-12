import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import {
  Cloud,
  CreditCard,
  Github,
  Keyboard,
  LifeBuoy,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  PlusCircle,
  Settings,
  Trash2,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Button } from "./button";

const meta = {
  title: "UI/DropdownMenu",
  component: DropdownMenu,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ── Stories ─────────────────────────────────────────── */

export const Basic: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Open menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        <DropdownMenuItem>
          <User className="h-4 w-4" /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="h-4 w-4" /> Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <LogOut className="h-4 w-4" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  args: {},
};

export const WithShortcuts: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-52">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="h-4 w-4" /> Profile
          <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CreditCard className="h-4 w-4" /> Billing
          <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="h-4 w-4" /> Settings
          <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Keyboard className="h-4 w-4" /> Keyboard shortcuts
          <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Github className="h-4 w-4" /> GitHub
        </DropdownMenuItem>
        <DropdownMenuItem>
          <LifeBuoy className="h-4 w-4" /> Support
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Cloud className="h-4 w-4" /> API (coming soon)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <LogOut className="h-4 w-4" /> Log out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  args: {},
};

export const WithCheckboxItems: Story = {
  render: () => {
    const [showStatus, setShowStatus] = useState(true);
    const [showLocation, setShowLocation] = useState(false);
    const [showTags, setShowTags] = useState(true);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">View options</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48">
          <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={showStatus}
            onCheckedChange={setShowStatus}
          >
            Status
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={showLocation}
            onCheckedChange={setShowLocation}
          >
            Location
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={showTags}
            onCheckedChange={setShowTags}
          >
            Tags
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  },
  args: {},
};

export const WithRadioItems: Story = {
  render: () => {
    const [position, setPosition] = useState("bottom");
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Panel: {position}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-44">
          <DropdownMenuLabel>Panel position</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={position} onValueChange={setPosition}>
            <DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="bottom">Bottom</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="right">Right</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  },
  args: {},
};

export const WithSubmenu: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Invite team</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-52">
        <DropdownMenuItem>
          <UserPlus className="h-4 w-4" /> Invite member
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Users className="h-4 w-4" /> Invite by
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>
              <Mail className="h-4 w-4" /> Email
            </DropdownMenuItem>
            <DropdownMenuItem>
              <MessageSquare className="h-4 w-4" /> Message
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <PlusCircle className="h-4 w-4" /> More…
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Plus className="h-4 w-4" /> New team
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  args: {},
};

export const Destructive: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Camp options</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-44">
        <DropdownMenuItem>
          <Settings className="h-4 w-4" /> Edit camp
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Users className="h-4 w-4" /> View bookings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Trash2 className="h-4 w-4" /> Delete camp
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  args: {},
};
