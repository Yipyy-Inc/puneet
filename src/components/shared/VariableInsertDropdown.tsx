"use client";

import { useState, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Braces } from "lucide-react";
import {
  type VariableContext,
  getGroupedVariablesForContext,
  getVariableDisplayTag,
} from "@/data/template-variables";

interface VariableInsertDropdownProps {
  context: VariableContext;
  onInsert: (variable: string) => void;
  disabled?: boolean;
}

export function VariableInsertDropdown({
  context,
  onInsert,
  disabled,
}: VariableInsertDropdownProps) {
  const [open, setOpen] = useState(false);
  const groups = useMemo(
    () => getGroupedVariablesForContext(context),
    [context],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-1.5 text-xs"
        >
          <Braces className="h-3.5 w-3.5" />
          Insert Variable
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search variables..." />
          <CommandList className="max-h-64">
            <CommandEmpty>No variables found.</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup key={group.category} heading={group.label}>
                {group.variables.map((v) => (
                  <CommandItem
                    key={v.key}
                    value={`${v.label} ${v.key}`}
                    onSelect={() => {
                      onInsert(getVariableDisplayTag(v.key));
                      setOpen(false);
                    }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{v.label}</span>
                        <code className="bg-muted text-muted-foreground rounded-sm px-1 py-0.5 text-xs">
                          {getVariableDisplayTag(v.key)}
                        </code>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {v.description}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
