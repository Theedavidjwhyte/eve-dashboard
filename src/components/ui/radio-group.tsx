import * as React from "react";
import { cn } from "@/lib/utils";

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
}

const RadioGroupContext = React.createContext<{
  value: string;
  setValue: (value: string) => void;
  name?: string;
} | null>(null);

function useRadioGroup() {
  const context = React.useContext(RadioGroupContext);
  if (!context) {
    throw new Error("RadioGroup components must be used within <RadioGroup />");
  }
  return context;
}

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value: controlledValue, defaultValue, onValueChange, name, ...props }, ref) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue || "");
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;

    const setValue = (val: string) => {
      if (!isControlled) setUncontrolledValue(val);
      onValueChange?.(val);
    };

    return (
      <RadioGroupContext.Provider value={{ value, setValue, name }}>
        <div ref={ref} role="radiogroup" className={cn("grid gap-2", className)} {...props} />
      </RadioGroupContext.Provider>
    );
  },
);
RadioGroup.displayName = "RadioGroup";

export interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  id?: string;
  disabled?: boolean;
}

export const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, id, disabled, children, ...props }, ref) => {
    const { value: groupValue, setValue, name } = useRadioGroup();
    const checked = groupValue === value;
    return (
      <label
        className={cn("flex items-center space-x-2 cursor-pointer", disabled && "opacity-50 cursor-not-allowed")}
        htmlFor={id || value}
      >
        <span className="relative flex items-center justify-center">
          <input
            ref={ref}
            type="radio"
            id={id || value}
            name={name}
            value={value}
            checked={checked}
            disabled={disabled}
            onChange={() => setValue(value)}
            className={cn(
              // Hide the native radio visually but keep it accessible
              "peer appearance-none h-5 w-5 rounded-full border border-input bg-background checked:border-primary checked:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
              className,
            )}
            {...props}
          />
          {/* Custom radio indicator */}
          <span
            className={cn(
              "pointer-events-none absolute left-0 top-0 h-5 w-5 rounded-full flex items-center justify-center",
              "border border-input",
              checked ? "border-primary" : "border-input",
            )}
            aria-hidden="true"
          >
            {checked && <span className="block h-2.5 w-2.5 rounded-full bg-primary" />}
          </span>
        </span>
        <span className="text-sm font-medium select-none">{children}</span>
      </label>
    );
  },
);
RadioGroupItem.displayName = "RadioGroupItem";
