"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit2, Image as ImageIcon } from "lucide-react";

interface Room {
  id: string;
  name: string;
  description: string;
  capacity: number;
  imageUrl: string;
  basePrice: number;
}

export default function DaycareRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([
    {
      id: "playroom-a",
      name: "Playroom A",
      description: "Main playroom for active dogs",
      capacity: 15,
      imageUrl: "/images/rooms/playroom-a.jpg",
      basePrice: 35,
    },
    {
      id: "playroom-b",
      name: "Playroom B",
      description: "Smaller dogs and calm play",
      capacity: 10,
      imageUrl: "/images/rooms/playroom-b.jpg",
      basePrice: 35,
    },
    {
      id: "quiet-zone",
      name: "Quiet Zone",
      description: "Low-energy pets and seniors",
      capacity: 8,
      imageUrl: "/images/rooms/quiet-zone.jpg",
      basePrice: 30,
    },
  ]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState<Room>({
    id: "",
    name: "",
    description: "",
    capacity: 0,
    imageUrl: "",
    basePrice: 0,
  });

  const openDialog = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      setRoomForm(room);
    } else {
      setEditingRoom(null);
      setRoomForm({
        id: `room-${Date.now()}`,
        name: "",
        description: "",
        capacity: 0,
        imageUrl: "",
        basePrice: 0,
      });
    }
    setDialogOpen(true);
  };

  const saveRoom = () => {
    if (editingRoom) {
      setRooms(rooms.map((r) => (r.id === roomForm.id ? roomForm : r)));
    } else {
      setRooms([...rooms, roomForm]);
    }
    setDialogOpen(false);
  };

  const deleteRoom = (id: string) => {
    setRooms(rooms.filter((r) => r.id !== id));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRoomForm({ ...roomForm, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Daycare Rooms</h2>
          <p className="text-muted-foreground">
            Manage room configurations, capacity, and pricing
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Room
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <Card key={room.id}>
            <CardContent className="p-0">
              {room.imageUrl && (
                <div className="relative w-full h-48 rounded-t-lg overflow-hidden">
                  <Image
                    src={room.imageUrl}
                    alt={room.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2">{room.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {room.description}
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Capacity:</span>
                    <span className="font-medium">{room.capacity} pets</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Base Price:</span>
                    <span className="font-semibold text-lg">
                      ${room.basePrice}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => openDialog(room)}
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteRoom(room.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rooms.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground mb-4">
              No rooms configured yet
            </p>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Room
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRoom ? "Edit Room" : "Add Room"}</DialogTitle>
            <DialogDescription>
              Configure room details, capacity, and pricing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Room Name</Label>
              <Input
                value={roomForm.name}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, name: e.target.value })
                }
                placeholder="e.g., Playroom A"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={roomForm.description}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, description: e.target.value })
                }
                placeholder="Brief description of the room"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input
                  type="number"
                  value={roomForm.capacity}
                  onChange={(e) =>
                    setRoomForm({
                      ...roomForm,
                      capacity: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="15"
                />
              </div>
              <div className="space-y-2">
                <Label>Base Price ($)</Label>
                <Input
                  type="number"
                  value={roomForm.basePrice}
                  onChange={(e) =>
                    setRoomForm({
                      ...roomForm,
                      basePrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="35"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Room Image</Label>
              {roomForm.imageUrl && (
                <div className="relative w-full h-32 rounded-lg overflow-hidden mb-2 border">
                  <Image
                    src={roomForm.imageUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={roomForm.imageUrl}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, imageUrl: e.target.value })
                  }
                  placeholder="/images/rooms/..."
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    document.getElementById("roomImageUpload")?.click()
                  }
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <input
                  id="roomImageUpload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveRoom}>Save Room</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
