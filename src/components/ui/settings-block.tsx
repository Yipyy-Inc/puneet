"use client";

import { useState, useEffect, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Edit } from "lucide-react";

export function SettingsBlock<T>({
  title,
  description,
  data,
  onSave,
  children,
}: {
  title: string;
  description?: string;
  data: T;
  onSave: (data: T) => void;
  children: (
    isEditing: boolean,
    localData: T,
    setLocalData: (d: T) => void,
  ) => ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localData, setLocalData] = useState(data);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  if (!mounted) {
    return null;
  }

  const handleSave = () => {
    onSave(localData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalData(data);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
          {isEditing ? (
            <div className="flex gap-2">
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>{children(isEditing, localData, setLocalData)}</CardContent>
    </Card>
  );
}
