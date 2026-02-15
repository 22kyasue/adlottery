import * as React from "react"
import { cn } from "@/lib/utils"
// Note: Installing class-variance-authority and @radix-ui/react-slot might be needed if not present.
// Since I didn't install them explicitly, I will use standard props or verify if shadcn-like structure accepts this.
// Ah, I need `class-variance-authority` and `clsx` and `tailwind-merge`. I installed the latter two.
// I'll skip cva and just use simple props for now to avoid dependency issues if `cva` is missing.
// Actually, I'll install `class-variance-authority` quickly or just write a simpler button.
// simpler:

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'gold';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {

        const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-95 transition-transform duration-100";

        const variants = {
            primary: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
            secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
            ghost: "hover:bg-accent hover:text-accent-foreground",
            gold: "gold-gradient shadow-lg hover:brightness-110 shadow-yellow-500/20",
        };

        const sizes = {
            sm: "h-8 px-3 text-xs",
            md: "h-9 px-4 py-2",
            lg: "h-10 px-8 text-lg",
            xl: "h-14 px-10 text-xl font-bold",
        };

        return (
            <button
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                ref={ref}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading ? (
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : null}
                {children}
            </button>
        )
    }
)
Button.displayName = "Button"

export { Button }
