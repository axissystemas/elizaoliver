import { test, expect } from '@playwright/test';

// Configuration for all tests in this file
test.describe.configure({ mode: 'serial' });

const TEST_USER = {
  email: process.env.NEXT_PUBLIC_NATIVE_ADMIN_EMAIL || '',
  password: process.env.NEXT_PUBLIC_NATIVE_ADMIN_PASSWORD || ''
};

const NEW_PATIENT = {
  name: `Paciente Teste ${Date.now()}`,
  age: '30',
  phone: '(11) 99999-0000',
  email: `teste.${Date.now()}@exemplo.com`,
  address: 'Rua de Teste, 123',
  profession: 'Testador'
};

test.beforeEach(async ({ page }) => {
  // Listen for dialogs (alerts, conforms) and print their messages
  page.on('dialog', async dialog => {
    console.log(`[ALERT/DIALOG]: ${dialog.message()}`);
    await dialog.dismiss();
  });

  // Login flow
  await page.goto('/');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button:has-text("Entrar no Sistema")');
  
  // Wait for dashboard to load completely
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Painel').first()).toBeVisible({ timeout: 15000 });
});

test('deve criar um novo paciente e verificar na lista', async ({ page }) => {
  // Navigate to patients view - Using a more specific selector for the sidebar button
  await page.locator('aside').getByText('Pacientes').click();
  await expect(page.getByRole('heading', { name: 'Gestão de Pacientes' })).toBeVisible({ timeout: 10000 });

  // Open modal
  await page.click('button:has-text("Cadastrar Paciente")');
  await expect(page.getByRole('heading', { name: 'Novo Cadastro' })).toBeVisible();

  // Fill form
  await page.fill('input[placeholder="Ex: Maria Silva"]', NEW_PATIENT.name);
  await page.fill('input[placeholder="000.000.000-00"]', '123.456.789-09');
  await page.fill('input[type="date"]', '1996-06-25');
  await page.fill('input[placeholder="(11) 99999-9999"]', NEW_PATIENT.phone);
  await page.fill('input[placeholder="email@exemplo.com"]', NEW_PATIENT.email);
  await page.fill('input[placeholder*="Rua das Flores"]', NEW_PATIENT.address);
  await page.fill('input[placeholder="Ex: Designer"]', NEW_PATIENT.profession);

  // Save
  await page.click('button:has-text("Salvar Cadastro")');

  // Verify success (modal closes)
  await expect(page.getByRole('heading', { name: 'Novo Cadastro' })).not.toBeVisible({ timeout: 10000 });

  // Verify in list
  await page.fill('input[placeholder*="Buscar por nome"]', NEW_PATIENT.name);
  await expect(page.getByText(NEW_PATIENT.name).first()).toBeVisible();
});

test('deve editar um paciente existente', async ({ page }) => {
  // Navigate to patients view
  await page.locator('aside').getByText('Pacientes').click();
  
  // Search for an existing patient to edit
  await page.fill('input[placeholder*="Buscar por nome"]', 'Julio Ramos');
  
  const editButton = page.locator('button[title="Editar Ficha"]').first();
  await editButton.click();
  
  await expect(page.getByRole('heading', { name: 'Editar Paciente' })).toBeVisible();

  // Fill in required fields if empty, then change occupation
  await page.fill('input[placeholder="000.000.000-00"]', '123.456.789-09');
  await page.fill('input[type="date"]', '1996-06-25');
  const newProfession = `Profissão ${Date.now()}`;
  await page.fill('input[placeholder="Ex: Designer"]', newProfession);

  // Save
  await page.click('button:has-text("Atualizar Cadastro")');

  // Verify modal closes
  await expect(page.getByRole('heading', { name: 'Editar Paciente' })).not.toBeVisible();

  // Verify changes in the list
  await expect(page.getByText(newProfession, { exact: false }).first()).toBeVisible();
});

test('deve excluir um paciente', async ({ page }) => {
  // Navigate to patients view
  await page.locator('aside').getByText('Pacientes').click();
  
  // Create a temp patient to delete
  const deleteTargetName = `Excluir_${Date.now()}`;
  await page.click('button:has-text("Cadastrar Paciente")');
  await page.fill('input[placeholder="Ex: Maria Silva"]', deleteTargetName);
  await page.fill('input[placeholder="000.000.000-00"]', '987.654.321-09');
  await page.fill('input[type="date"]', '1986-06-25');
  await page.fill('input[placeholder="(11) 99999-9999"]', '(11) 99999-9999');
  await page.fill('input[placeholder="email@exemplo.com"]', `delete.${Date.now()}@exemplo.com`);
  await page.fill('input[placeholder*="Rua das Flores"]', 'Rua de Teste');
  await page.fill('input[placeholder="Ex: Designer"]', 'Testador');
  await page.click('button:has-text("Salvar Cadastro")');
  await expect(page.getByRole('heading', { name: 'Novo Cadastro' })).not.toBeVisible({ timeout: 10000 });

  // Search for the patient
  await page.fill('input[placeholder*="Buscar por nome"]', deleteTargetName);
  await expect(page.getByText(deleteTargetName).first()).toBeVisible();

  // Click delete button
  const deleteButton = page.locator('button[title="Excluir"]').first();
  await deleteButton.click();

  // Let's assume there's a confirmation
  const confirmButton = page.getByRole('button', { name: 'Excluir' }).last();
  if (await confirmButton.isVisible()) {
    await confirmButton.click();
  }

  // Verify it's gone
  await page.fill('input[placeholder*="Buscar por nome"]', deleteTargetName);
  await expect(page.getByText(deleteTargetName)).not.toBeVisible();
});

