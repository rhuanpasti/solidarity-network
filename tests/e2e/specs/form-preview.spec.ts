import { test, expect } from '@playwright/test';
import { loginAs } from '../src/fixtures';
import { mockedBeneficiaryFormData } from '../src/form-data';

test('fills the beneficiary form with synthetic data without submitting it', async ({ page }) => {
  await loginAs(page);
  await page.goto('/beneficiaries');

  await page.getByTestId('beneficiary-create').getByRole('button').click();
  const form = page.getByTestId('beneficiary-form');
  await expect(form).toBeVisible();

  await form.getByLabel('Full name').fill(mockedBeneficiaryFormData.fullName);
  await form.getByLabel('Email').fill(mockedBeneficiaryFormData.email);
  await form.getByLabel(/document/i).fill(mockedBeneficiaryFormData.document);
  await form.getByLabel('Birth date').fill(mockedBeneficiaryFormData.birthDate);
  await form.getByLabel('Phone').fill(mockedBeneficiaryFormData.phone);
  await form.getByLabel('Notes').fill(mockedBeneficiaryFormData.notes);

  await expect(form.getByLabel('Full name')).toHaveValue(mockedBeneficiaryFormData.fullName);
  await expect(form.getByLabel('Email')).toHaveValue(mockedBeneficiaryFormData.email);
  await expect(form.getByLabel(/document/i)).toHaveValue('529.982.247-25');
  await expect(form.getByLabel('Notes')).toHaveValue(mockedBeneficiaryFormData.notes);
});
