import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";
import { Badge } from "./badge";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Label } from "./label";
import { Separator } from "./separator";
import { Progress } from "./progress";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./card";

// Smoke dos primitivos shadcn (cva + base-ui): garante que montam e propagam
// variantes/props básicas sem quebrar.
describe("ui primitives", () => {
  it("Button renders its label and variant classes", () => {
    render(<Button variant="destructive">Excluir</Button>);
    const btn = screen.getByRole("button", { name: "Excluir" });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain("destructive");
  });

  it("Badge renders text", () => {
    render(<Badge>Novo</Badge>);
    expect(screen.getByText("Novo")).toBeInTheDocument();
  });

  it("Input and Textarea reflect their value and Label associates by htmlFor", () => {
    render(
      <>
        <Label htmlFor="f">Campo</Label>
        <Input id="f" defaultValue="abc" />
        <Textarea defaultValue="multi" aria-label="ta" />
      </>,
    );
    expect(screen.getByLabelText("Campo")).toHaveValue("abc");
    expect(screen.getByLabelText("ta")).toHaveValue("multi");
  });

  it("Separator and Progress render", () => {
    const { container } = render(
      <>
        <Separator />
        <Progress value={42} />
      </>,
    );
    expect(container.querySelectorAll("div").length).toBeGreaterThan(0);
  });

  it("Card composes its header/title/description/content", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Título</CardTitle>
          <CardDescription>Desc</CardDescription>
        </CardHeader>
        <CardContent>Corpo</CardContent>
      </Card>,
    );
    expect(screen.getByText("Título")).toBeInTheDocument();
    expect(screen.getByText("Desc")).toBeInTheDocument();
    expect(screen.getByText("Corpo")).toBeInTheDocument();
  });
});
