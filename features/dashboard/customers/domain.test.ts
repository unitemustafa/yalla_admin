import { describe, expect, it } from "vitest";

import type { DashboardUser } from "../users/types";
import {
  createCustomerPayload,
  customerCreateErrorFromApi,
  filterCustomers,
  paginateCustomers,
  sanitizeCustomerInput,
  splitFullName,
  validateCustomerDraft,
} from "./domain";
import { CustomerCreateError, type CustomerDraft } from "./types";

const validDraft: CustomerDraft = {
  name: "مصطفى علي حسن",
  username: "mostafa.user",
  phone: "01012345678",
  email: "MOSTAFA@EXAMPLE.COM",
  password: "Strong1!",
};

function dashboardUser(
  id: string,
  name: string,
  username: string,
): DashboardUser {
  return {
    id,
    name,
    username,
    phone: "غير متاح",
    email: "غير متاح",
    avatar: "/avatar.svg",
    role: "عميل",
    branch: "غير محدد",
    location: "غير محدد",
    joinedAt: "غير متاح",
    lastLogin: "غير متاح",
    orders: 0,
    totalSpent: "0",
    lastOrder: "غير متاح",
    status: "مفعل",
    notes: "",
  };
}

describe("customers domain", () => {
  it("splits names and creates the existing client payload", () => {
    expect(splitFullName("  مصطفى   علي حسن ")).toEqual({
      first_name: "مصطفى",
      last_name: "علي حسن",
    });
    expect(createCustomerPayload(validDraft)).toEqual({
      first_name: "مصطفى",
      last_name: "علي حسن",
      username: "mostafa.user",
      email: "mostafa@example.com",
      phone: "+201012345678",
      password: "Strong1!",
      role: "client",
      is_active: true,
      is_staff: false,
      is_superuser: false,
    });
  });

  it("sanitizes form inputs and preserves valid drafts", () => {
    expect(sanitizeCustomerInput("phone", "01 012-3456789")).toBe(
      "01012345678",
    );
    expect(sanitizeCustomerInput("username", " user name ")).toBe("username");
    expect(sanitizeCustomerInput("password", "Strong 1!")).toBe("Strong1!");
    expect(validateCustomerDraft(validDraft)).toEqual({});
  });

  it("returns field-specific validation and translated API errors", () => {
    expect(
      validateCustomerDraft({
        name: "",
        username: "1",
        phone: "123",
        email: "invalid",
        password: "weak",
      }),
    ).toEqual({
      name: "اكتب اسم المستخدم.",
      username:
        "اسم المستخدم يبدأ بحرف ويكون من 3 إلى 150 حرفًا دون مسافات.",
      phone: "اكتب رقم هاتف صحيحًا.",
      email: "اكتب بريدًا إلكترونيًا صحيحًا.",
      password: "كلمة المرور لا تحقق كل الشروط.",
    });

    const error = customerCreateErrorFromApi(
      {
        username: ["This username is already taken"],
        email: ["User with this email already exists"],
      },
      "fallback",
    );
    expect(error).toBeInstanceOf(CustomerCreateError);
    expect(error.message).toBe("اسم الدخول مستخدم بالفعل.");
    expect(error.fieldErrors).toEqual({
      username: "اسم الدخول مستخدم بالفعل.",
      email: "البريد الإلكتروني مسجل بالفعل.",
    });
  });

  it("filters by name or username and keeps safe pagination", () => {
    const users = Array.from({ length: 12 }, (_, index) =>
      dashboardUser(
        String(index + 1),
        index === 10 ? "أحمد علي" : `عميل ${index + 1}`,
        index === 11 ? "special-user" : `user-${index + 1}`,
      ),
    );

    expect(filterCustomers(users, "أحمد").map((user) => user.id)).toEqual([
      "11",
    ]);
    expect(filterCustomers(users, "SPECIAL").map((user) => user.id)).toEqual([
      "12",
    ]);
    expect(paginateCustomers(users, 5)).toMatchObject({
      totalPages: 2,
      safeCurrentPage: 2,
      pageStartIndex: 10,
    });
    expect(paginateCustomers(users, 5).pagedCustomers).toHaveLength(2);
  });
});
