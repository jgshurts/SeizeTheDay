import { render, screen } from "@testing-library/react";
import { AuthProvider } from "../context/AuthContext";
import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  it("renders a Google sign-in button", () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>,
    );

    expect(screen.getByRole("button", { name: /sign in with google/i })).toBeInTheDocument();
  });
});
