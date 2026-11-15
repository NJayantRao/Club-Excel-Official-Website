import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/authorize-admin";
import { buildFieldUpdate } from "@/lib/form-field-options";

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      fieldId: string;
    }>;
  }
) {
  try {
    const auth = await requireAdminAuth();

    if (!auth.success) {
      return auth.response;
    }

    const { id, fieldId } = await params;

    const data = await request.json();

    const existingField = await prisma.eventFormField.findFirst({
      where: {
        id: fieldId,
        eventId: id,
      },
    });

    if (!existingField) {
      return Response.json(
        {
          success: false,
          message: "Form field not found",
        },
        { status: 404 }
      );
    }

    const result = buildFieldUpdate(data, existingField);

    if ("error" in result) {
      return Response.json(
        { success: false, message: result.error },
        { status: 400 }
      );
    }

    const formField = await prisma.eventFormField.update({
      where: {
        id: fieldId,
      },
      data: result.update,
    });

    return Response.json(
      {
        success: true,
        message: "Form field updated successfully",
        formField,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to update form field:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to update form field",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      fieldId: string;
    }>;
  }
) {
  try {
    const auth = await requireAdminAuth();

    if (!auth.success) {
      return auth.response;
    }

    const { id, fieldId } = await params;

    const existingField = await prisma.eventFormField.findFirst({
      where: {
        id: fieldId,
        eventId: id,
      },
    });

    if (!existingField) {
      return Response.json(
        {
          success: false,
          message: "Form field not found",
        },
        { status: 404 }
      );
    }

    await prisma.eventFormField.delete({
      where: {
        id: fieldId,
      },
    });

    return Response.json(
      {
        success: true,
        message: "Form field deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to delete form field:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to delete form field",
      },
      { status: 500 }
    );
  }
}
