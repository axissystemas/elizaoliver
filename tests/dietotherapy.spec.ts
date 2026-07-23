import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const TEST_USER = {
  email: process.env.NEXT_PUBLIC_NATIVE_ADMIN_EMAIL || '',
  password: process.env.NEXT_PUBLIC_NATIVE_ADMIN_PASSWORD || ''
};

const NEW_FOOD = {
  name: `Alimento Teste ${Date.now()}`,
  category: 'folhas',
  nature: 'Fresco',
  flavors: ['Amargo', 'Doce'],
  channels: ['Fígado', 'Pulmão']
};

test.beforeEach(async ({ page }) => {
  page.on('dialog', async dialog => {
    console.log(`[ALERT/DIALOG]: ${dialog.message()}`);
    await dialog.dismiss();
  });

  // Login
  await page.goto('/');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button:has-text("Entrar no Sistema")');
  
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Painel').first()).toBeVisible({ timeout: 15000 });
});

test('deve navegar para Dietoterapia Chinesa dentro de Protocolos', async ({ page }) => {
  await page.locator('aside').getByText('Protocolos e Orientações').click();
  await expect(page.getByText('Dietoterapia Chinesa').first()).toBeVisible({ timeout: 10000 });

  // Alterna para a aba Dietoterapia Chinesa se necessário
  const dietTab = page.getByRole('button', { name: /Dietoterapia Chinesa/i }).first();
  if (await dietTab.isVisible()) {
    await dietTab.click();
  }

  await expect(page.getByText('Biblioteca de Alimentos e Nutrição Energética')).toBeVisible();
});

test('deve filtrar alimentos por busca textual', async ({ page }) => {
  await page.locator('aside').getByText('Protocolos e Orientações').click();
  
  const searchInput = page.getByPlaceholder(/Buscar por nome, sinônimo/i);
  await searchInput.fill('Gengibre');
  
  await expect(page.getByText('Gengibre').first()).toBeVisible();
});

test('deve abrir o modal de cadastro de novo alimento', async ({ page }) => {
  await page.locator('aside').getByText('Protocolos e Orientações').click();
  
  await page.click('button:has-text("Cadastrar Alimento")');
  await expect(page.getByText('Cadastro de Alimento (MTC)')).toBeVisible({ timeout: 10000 });
  
  // Preencher nome do alimento
  await page.fill('input[placeholder="Ex: Gengibre, Inhame, Maçã..."]', NEW_FOOD.name);
  
  // Fechar modal
  await page.click('button:has-text("Cancelar")');
  await expect(page.getByText('Cadastro de Alimento (MTC)')).not.toBeVisible();
});

test('deve abrir o modal de importação em lote e testar carga de exemplo', async ({ page }) => {
  await page.locator('aside').getByText('Protocolos e Orientações').click();
  
  await page.click('button:has-text("Importar Lote")');
  await expect(page.getByText('Importação & Carga Inicial')).toBeVisible({ timeout: 10000 });
  
  // Testar carregamento de semente de exemplo
  await page.click('button:has-text("Carregar Exemplo Prático")');
  
  const textarea = page.locator('textarea');
  await expect(textarea).toContainText('Categoria;Nome;Sabor;Natureza;Canais');
});
