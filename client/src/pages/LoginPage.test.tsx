import { render, screen } from "@testing-library/react";
import { AuthProvider } from "../context/AuthContext";
import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  it("renders nickname and password fields", () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>,
    );

    expect(screen.getByLabelText(/nickname/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });
});
