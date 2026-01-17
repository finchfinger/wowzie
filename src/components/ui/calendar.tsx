import * as React from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "../../lib/utils";

type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  showOutsideDays?: boolean;
  captionLayout?: React.ComponentProps<typeof DayPicker>["captionLayout"];
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  formatters,
  components,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      className={cn("bg-white p-3 [--cell-size:2.25rem]", className)}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          "inline-flex h-[--cell-size] w-[--cell-size] items-center justify-center rounded-md border border-black/10 bg-white text-gray-900 shadow-sm",
          "hover:bg-gray-50",
          "focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300",
          "aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          "inline-flex h-[--cell-size] w-[--cell-size] items-center justify-center rounded-md border border-black/10 bg-white text-gray-900 shadow-sm",
          "hover:bg-gray-50",
          "focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300",
          "aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-[--cell-size] w-full items-center justify-center px-[--cell-size]",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-[--cell-size] w-full items-center justify-center gap-1.5 text-sm font-medium text-gray-900",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative rounded-md border border-black/10 bg-white",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn("absolute inset-0 opacity-0", defaultClassNames.dropdown),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label"
            ? "text-sm"
            : "flex h-8 items-center gap-1 rounded-md pl-2 pr-1 text-sm [&>svg]:size-3.5",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 select-none rounded-md text-[0.8rem] font-normal text-gray-500",
          defaultClassNames.weekday
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        day: cn(
          "group/day relative aspect-square h-full w-full select-none p-0 text-center",
          "[&:first-child[data-selected=true]_button]:rounded-l-md",
          "[&:last-child[data-selected=true]_button]:rounded-r-md",
          defaultClassNames.day
        ),
        day_button: cn(
          "inline-flex h-[--cell-size] w-[--cell-size] items-center justify-center rounded-md text-sm font-normal text-gray-900",
          "hover:bg-gray-50",
          "focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300",
          "data-[selected=true]:bg-violet-600 data-[selected=true]:text-white",
          defaultClassNames.day_button
        ),
        range_start: cn("rounded-l-md", defaultClassNames.range_start),
        range_middle: cn(
          "rounded-none data-[selected=true]:bg-violet-100 data-[selected=true]:text-violet-900",
          defaultClassNames.range_middle
        ),
        range_end: cn("rounded-r-md", defaultClassNames.range_end),
        today: cn(
          "data-[selected=false]:bg-violet-50 data-[selected=false]:text-gray-900",
          defaultClassNames.today
        ),
        outside: cn(
          "text-gray-400 aria-selected:text-gray-400",
          defaultClassNames.outside
        ),
        disabled: cn("text-gray-400 opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation, ...p }) => {
          if (orientation === "left") {
            return <ChevronLeftIcon className={cn("size-4", className)} {...p} />;
          }
          if (orientation === "right") {
            return <ChevronRightIcon className={cn("size-4", className)} {...p} />;
          }
          return <ChevronDownIcon className={cn("size-4", className)} {...p} />;
        },
        ...components,
      }}
      {...props}
    />
  );
}

export { Calendar };
