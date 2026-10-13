import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge, badgeVariants } from "./badge.tsx";
import { Button, buttonVariants } from "./button.tsx";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card.tsx";
import { Input } from "./input.tsx";
import { Label } from "./label.tsx";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table.tsx";

describe("Badge", () => {
  it("renders a span with the default variant", () => {
    render(<Badge>New</Badge>);
    const badge = screen.getByText("New");
    expect(badge.tagName).toBe("SPAN");
    expect(badge).toHaveAttribute("data-slot", "badge");
    expect(badge).toHaveAttribute("data-variant", "default");
    expect(badge).toHaveClass("bg-primary");
  });

  it("applies variants and renders its child with asChild", () => {
    render(
      <Badge variant="destructive" asChild className="extra">
        <a href="/x">Link badge</a>
      </Badge>,
    );
    const link = screen.getByRole("link", { name: "Link badge" });
    expect(link).toHaveAttribute("data-variant", "destructive");
    expect(link).toHaveClass("bg-destructive", "extra");
    expect(badgeVariants({ variant: "outline" })).toContain("border-border");
  });
});

describe("Button", () => {
  it("renders a button with default variant and size", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("data-variant", "default");
    expect(button).toHaveAttribute("data-size", "default");
    expect(button).toHaveClass("bg-primary", "h-9");
  });

  it("applies variant, size and classes, and supports asChild", () => {
    render(
      <Button variant="outline" size="sm" className="extra" asChild>
        <a href="/x">Go</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Go" });
    expect(link).toHaveAttribute("data-variant", "outline");
    expect(link).toHaveAttribute("data-size", "sm");
    expect(link).toHaveClass("border", "h-8", "extra");
    expect(buttonVariants({ variant: "ghost", size: "icon" })).toContain("size-9");
  });
});

describe("Card", () => {
  it("renders every slot with merged classes", () => {
    const { container } = render(
      <Card className="c">
        <CardHeader className="h">
          <CardTitle className="t">Title</CardTitle>
          <CardDescription className="d">Description</CardDescription>
          <CardAction className="a">Action</CardAction>
        </CardHeader>
        <CardContent className="x">Content</CardContent>
        <CardFooter className="f">Footer</CardFooter>
      </Card>,
    );
    const slots = ["card", "card-header", "card-title", "card-description", "card-action", "card-content", "card-footer"];
    const classes = ["c", "h", "t", "d", "a", "x", "f"];
    slots.forEach((slot, index) => {
      expect(container.querySelector(`[data-slot="${slot}"]`)).toHaveClass(classes[index]);
    });
    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});

describe("Input and Label", () => {
  it("associates a label with an input and forwards props", () => {
    render(
      <>
        <Label htmlFor="email" className="l">
          Email
        </Label>
        <Input id="email" type="email" className="i" placeholder="you@example.com" />
      </>,
    );
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("data-slot", "input");
    expect(input).toHaveClass("i");
    expect(screen.getByText("Email")).toHaveAttribute("data-slot", "label");
  });
});

describe("Table", () => {
  it("renders all table parts", () => {
    const { container } = render(
      <Table className="tbl">
        <TableCaption>Caption</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Ada</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );
    expect(screen.getByRole("table")).toHaveClass("tbl");
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Ada" })).toBeInTheDocument();
    expect(screen.getByText("Caption").tagName).toBe("CAPTION");
    for (const slot of ["table-container", "table-header", "table-body", "table-footer", "table-row", "table-caption"]) {
      expect(container.querySelector(`[data-slot="${slot}"]`)).not.toBeNull();
    }
  });
});
