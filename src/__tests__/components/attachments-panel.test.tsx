/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockUpdateField = jest.fn().mockResolvedValue(true);
const mockReorder = jest.fn().mockResolvedValue(undefined);
const mockDelete = jest.fn().mockResolvedValue(undefined);
const mockUploadAndAttach = jest.fn().mockResolvedValue("new-id");
const mockMutate = jest.fn().mockResolvedValue(undefined);

let attachments: any[] = [];

jest.mock("@/hooks/useAttachmentData", () => ({
  useAttachmentsData: () => ({
    attachmentsData: attachments,
    attachmentsError: undefined,
    mutateAttachments: mockMutate,
  }),
}));
jest.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ currentUser: { _id: "u1" } }),
}));
jest.mock("@/utils/handlers/attachmentHandlers", () => ({
  uploadAndAttach: (...args: any[]) => mockUploadAndAttach(...args),
  updateAttachmentField: (...args: any[]) => mockUpdateField(...args),
  reorderAttachments: (...args: any[]) => mockReorder(...args),
  handleDeleteAttachment: (...args: any[]) => mockDelete(...args),
}));
jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), message: jest.fn() }),
}));

import { AttachmentPanel } from "@/components/attachments/AttachmentPanel";

const row = (over: Partial<any> = {}) => ({
  _id: "a1",
  fileId: "f1",
  targetType: "sample",
  targetId: "s1",
  category: "gallery",
  kind: "image",
  contentType: "image/png",
  caption: null,
  order: 0,
  ...over,
});

beforeEach(() => {
  attachments = [];
  jest.clearAllMocks();
});

test("shows an empty state when the target has no attachments", () => {
  render(<AttachmentPanel targetType="sample" targetId="s1" />);
  expect(screen.getByText(/No attachments yet/i)).toBeInTheDocument();
});

test("renders an image attachment as an <img> and a document as a link", () => {
  attachments = [
    row({ _id: "img", fileId: "fimg", kind: "image" }),
    row({ _id: "doc", fileId: "fdoc", kind: "document", contentType: "application/pdf", caption: "Protocol" }),
  ];
  render(<AttachmentPanel targetType="sample" targetId="s1" />);

  const img = screen.getByRole("img", { name: /attachment/i });
  expect(img).toHaveAttribute("src", expect.stringContaining("/api/files/fimg"));

  const link = screen.getByRole("link", { name: /Protocol/i });
  expect(link).toHaveAttribute("href", expect.stringContaining("/api/files/fdoc"));
});

test("editing a caption calls updateAttachmentField", async () => {
  attachments = [row({ _id: "a1", kind: "image", caption: null })];
  render(<AttachmentPanel targetType="sample" targetId="s1" />);

  fireEvent.click(screen.getByRole("button", { name: /edit caption/i }));
  const input = screen.getByPlaceholderText("Caption");
  fireEvent.change(input, { target: { value: "left spinneret" } });
  fireEvent.keyDown(input, { key: "Enter" });

  await waitFor(() => expect(mockUpdateField).toHaveBeenCalledWith("a1", "caption", "left spinneret"));
});
