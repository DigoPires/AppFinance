import { db } from "./db";
import { expenses } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function processRecurringExpenses() {
  console.log("🔄 Processing recurring expenses...");

  try {
    // Get current date
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    // Find all fixed expenses grouped by user, category, and description
    const fixedExpenses = await db
      .select({
        userId: expenses.userId,
        category: expenses.category,
        description: expenses.description,
        unitValue: expenses.unitValue,
        quantity: expenses.quantity,
        totalValue: expenses.totalValue,
        paymentMethod: expenses.paymentMethod,
        account: expenses.account,
        location: expenses.location,
        isFixed: expenses.isFixed,
        paymentDate: expenses.paymentDate,
        isPaid: expenses.isPaid,
        installments: expenses.installments,
        notes: expenses.notes,
        latestDate: sql`MAX(${expenses.date})`.as('latest_date'),
      })
      .from(expenses)
      .where(eq(expenses.isFixed, true))
      .groupBy(
        expenses.userId,
        expenses.category,
        expenses.description,
        expenses.unitValue,
        expenses.quantity,
        expenses.totalValue,
        expenses.paymentMethod,
        expenses.account,
        expenses.location,
        expenses.isFixed,
        expenses.paymentDate,
        expenses.isPaid,
        expenses.installments,
        expenses.notes
      );

    console.log(`Found ${fixedExpenses.length} fixed expense templates`);

    for (const template of fixedExpenses) {
      // Check if the latest expense for this template is still marked as fixed
      const latestExpense = await db
        .select()
        .from(expenses)
        .where(
          and(
            eq(expenses.userId, template.userId),
            eq(expenses.category, template.category),
            eq(expenses.description, template.description),
            eq(expenses.isFixed, true)
          )
        )
        .orderBy(desc(expenses.date))
        .limit(1);

      if (latestExpense.length === 0) {
        console.log(`No latest expense found for template: ${template.description}`);
        continue;
      }

      const lastExpense = latestExpense[0];

      // If the latest expense is no longer fixed, skip
      if (!lastExpense.isFixed) {
        console.log(`Skipping ${template.description} - latest expense is no longer fixed`);
        continue;
      }

      // Check if we already have an expense for this month
      const existingThisMonth = await db
        .select()
        .from(expenses)
        .where(
          and(
            eq(expenses.userId, template.userId),
            eq(expenses.category, template.category),
            eq(expenses.description, template.description),
            sql`EXTRACT(MONTH FROM ${expenses.date}) = ${currentMonth}`,
            sql`EXTRACT(YEAR FROM ${expenses.date}) = ${currentYear}`
          )
        )
        .limit(1);

      if (existingThisMonth.length > 0) {
        console.log(`Already have expense for ${template.description} in ${currentMonth}/${currentYear}`);
        continue;
      }

      // Create new expense for current month
      const newDate = new Date(currentYear, currentMonth - 1, 1); // 1st day of current month

      await db.insert(expenses).values({
        userId: template.userId,
        date: newDate.toISOString().split('T')[0], // YYYY-MM-DD
        category: template.category,
        description: template.description,
        unitValue: template.unitValue,
        quantity: template.quantity,
        totalValue: template.totalValue,
        paymentMethod: template.paymentMethod,
        account: template.account,
        location: template.location,
        isFixed: true, // Keep it fixed
        paymentDate: template.paymentDate,
        isPaid: false, // Reset payment status
        installments: template.installments,
        notes: template.notes,
      });

      console.log(`✅ Created recurring expense: ${template.description} for ${currentMonth}/${currentYear}`);
    }

    console.log("✅ Recurring expenses processing completed");
  } catch (error) {
    console.error("❌ Error processing recurring expenses:", error);
  }
}

// For testing - run manually
if (import.meta.url === `file://${process.argv[1]}`) {
  processRecurringExpenses().then(() => process.exit(0));
}