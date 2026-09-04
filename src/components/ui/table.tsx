"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

function Table({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<"table"> & {
  /**
   * Classes for the scroll container around the table.
   *
   * It exists so `DataTable` can turn the sideways scroll OFF. §6 rule 6: "a
   * table that will not fit LOSES COLUMNS, it does not scroll", because a
   * sideways-scrolling table pushes the identity column out of view and
   * identity is what makes the other columns legible.
   *
   * The default keeps `overflow-x-auto` rather than dropping it globally:
   * every table NOT going through `DataTable` still has whatever column count
   * it was written with and no budget enforcing anything, so removing the
   * escape hatch under them would replace a scroll with a clipped table —
   * worse, and silent. They lose it when they gain a budget.
   */
  containerClassName?: string;
}) {
  return (
    <div
      data-slot="table-container"
      className={cn("relative w-full overflow-x-auto", containerClassName)}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        `bg-muted/50 border-t font-medium [&>tr]:last:border-b-0`,
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        `hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors`,
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        `text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 *:[[role=checkbox]]:translate-y-[2px]`,
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        `p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 *:[[role=checkbox]]:translate-y-[2px]`,
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
