/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ProfileFormSamples } from "@/components/forms/profile-form-samples";

// The form pulls its type list from the config and its ID rules from settings.
const sampletypes = [
  { value: "animal", label: "Animal" },
  {
    value: "crop",
    label: "Crop",
    fields: [
      "responsible",
      "date",
      { key: "plot", label: "Plot number", kind: "text" },
      {
        key: "stage",
        label: "Growth stage",
        kind: "select",
        options: [{ value: "seedling", label: "Seedling" }],
      },
    ],
  },
];

jest.mock("@/hooks/useConfigTypes", () => ({
  useConfigTypes: () => ({ sampletypes, samplesubtypes: [], loading: false }),
}));
jest.mock("@/hooks/useMainSettings", () => ({
  useMainSettings: () => ({
    idGeneration: { combinations: [[3, 3]], startingNumber: 1, numberPadding: 0 },
    labInfo: { name: "", location: "" },
    loading: false,
  }),
}));
jest.mock("@/hooks/userHooks", () => ({ getUserIdByName: () => "u1" }));
jest.mock("swr", () => ({ mutate: jest.fn() }));
jest.mock("sonner", () => ({ toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn(), message: jest.fn() }) }));
// TaxonomicHierarchy does its own network validation; stand it in.
jest.mock("@/components/ui/custom/TaxonomicHierarchy", () => ({
  TaxonomicHierarchy: () => <div data-testid="taxonomy-widget" />,
}));

const props = { users: [{ _id: "u1", name: "admin" }], samples: [], user: { name: "admin" } };

describe("ProfileFormSamples field rendering", () => {
  test("animal falls back to its built-in layout: taxonomy and sex, no crop fields", () => {
    render(<ProfileFormSamples {...props} page="animal" />);
    expect(screen.getByTestId("taxonomy-widget")).toBeInTheDocument();
    expect(screen.getByText("Sex")).toBeInTheDocument();
    expect(screen.queryByText("Plot number")).not.toBeInTheDocument();
  });

  test("a configured type renders exactly its fields list", () => {
    render(<ProfileFormSamples {...props} page="crop" />);
    expect(screen.getByText("Plot number")).toBeInTheDocument();
    expect(screen.getByText("Growth stage")).toBeInTheDocument();
    expect(screen.getByText("Responsible")).toBeInTheDocument();
    // sex is not in the crop list
    expect(screen.queryByText("Sex")).not.toBeInTheDocument();
  });

  test("the type picker, notes and name are always present", () => {
    render(<ProfileFormSamples {...props} page="crop" />);
    expect(screen.getByText("Sample type")).toBeInTheDocument();
    expect(screen.getByText("Optional notes")).toBeInTheDocument();
    expect(screen.getByText("Sample name / ID")).toBeInTheDocument();
  });
});
