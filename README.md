# Market List Generator

Gerador de Lista de Compras com envio automático para WhatsApp!

## Site em funcionamento

- URL: https://market-list-generator.onrender.com/
- Observação: se aparecer uma tela preta do Render ao acessar, aguarde cerca de 5–10 segundos para o serviço ativar o site (cold start).

## Descrição

Este é um projeto de automação pessoal desenvolvido em **C# e .NET** que permite criar rapidamente uma lista de compras através de uma interface web moderna e enviá-la formatada diretamente para o WhatsApp.

## Funcionalidades

- Interface web responsiva e moderna
- Seleção rápida de itens por categoria
- Organização automática por categorias (Grãos, Laticínios, Carnes, Hortifruti, etc.)
- Geração automática de link do WhatsApp
- Mensagem formatada com emojis
- Botões para selecionar/limpar todos os itens
- Contador de itens selecionados

## Como Executar

### Pré-requisitos

- SDK do .NET instalado (versão 8.0 ou superior recomendada)

### Executar o Projeto

#### Opção 1: Via Script Batch (Windows)

```bash
start.bat
```

#### Opção 2: Via Terminal

```bash
cd Market_List_Generator
dotnet run
```

#### Opção 3: Via Visual Studio

1. Abra o projeto no Visual Studio
2. Pressione **F5** ou clique em **Run**
3. O navegador abrirá automaticamente

### Acessar a Aplicação

Após executar, acesse no navegador:

- **HTTPS**: https://localhost:51773
- **HTTP**: http://localhost:51774

## Como Usar

1. **Selecione os itens** que deseja comprar clicando nas caixas de seleção
2. Veja o **contador** de itens selecionados na parte inferior
3. Use os botões:
   - **Selecionar Todos**: Marca todos os itens
   - **Limpar Seleção**: Desmarca todos os itens
   - **Enviar para WhatsApp**: Abre o WhatsApp com a mensagem formatada
4. O WhatsApp Web/Desktop abrirá automaticamente com a mensagem pronta
5. Envie para você mesmo ou para outra pessoa!

## Categorias Disponíveis

- **Grãos e Panificados** - Arroz, Macarrão, Pão, Farinha, etc.
- **Laticínios e Ovos** - Leite, Queijo, Iogurte, Ovos, etc.
- **Carnes** - Frango, Carne bovina, Embutidos, etc.
- **Hortifruti** - Frutas, Verduras, Legumes
- **Condimentos e Temperos** - Sal, Açúcar, Molhos, Temperos
- **Bebidas e Lanches** - Café, Sucos, Refrigerantes, etc.
- **Limpeza** - Produtos de limpeza doméstica
- **Higiene Pessoal** - Sabonete, Shampoo, Desodorante, etc.

## Arquitetura

O projeto segue uma arquitetura limpa em camadas:

```
Market_List_Generator/
├── src/
│   ├── Domain/                    # Camada de Domínio
│   │   ├── Entities/              # Entidades do domínio
│   │   │   └── Item.cs
│   │   ├── Enums/                 # Enumerações
│   │   │   └── CategoryType.cs
│   │   └── Interfaces/            # Contratos
│   │       └── IItemRepository.cs
│   │
│   ├── Application/               # Camada de Aplicação
│   │   └── Services/              # Lógica de negócio
│   │       └── MarketListService.cs
│   │
│   └── Infrastructure/            # Camada de Infraestrutura
│       └── Repositories/          # Implementações de repositórios
│           └── ItemRepository.cs
│
├── Presentation/                  # Camada de Apresentação
│   └── WebApp/
│       ├── Controllers/           # Controllers MVC
│       │   └── HomeController.cs
│       ├── Views/                 # Views Razor
│       │   ├── Shared/
│       │   │   └── _Layout.cshtml
│       │   └── Home/
│       │       └── Index.cshtml
│       ├── _ViewStart.cshtml
│       └── wwwroot/               # Arquivos estáticos
│           ├── css/
│           │   └── site.css
│           └── js/
│               └── site.js
│
├── Properties/                    # Configurações do projeto
│   └── launchSettings.json
│
├── Program.cs                     # Ponto de entrada da aplicação
├── appsettings.json              # Configurações gerais
├── Market_List_Generator.csproj  # Arquivo do projeto
├── start.bat                     # Script de inicialização
└── README.md                     # Este arquivo
```

## Tecnologias Utilizadas

- **C#**
- **.NET**
- **ASP.NET Core MVC**
- **Razor Pages**
- **HTML5/CSS3**
- **JavaScript (Vanilla)**

## Exemplo de Mensagem Gerada

```
*LISTA DE COMPRAS*

*Grãos e Panificados*
  - Arroz
  - Macarrão
  - Pão

*Laticínios e Ovos*
  - Leite
  - Ovos
  - Queijo

*Carnes*
  - Filé de peito
  - Carne moída

*Hortifruti*
  - Alface
  - Tomate
  - Batata
```

## Personalização

### Adicionar Novos Itens

Edite o arquivo: `src/Infrastructure/Repositories/ItemRepository.cs`

```csharp
new Item(ID, "Nome do Item", CategoryType.Categoria),
```

### Adicionar Novas Categorias

1. Adicione a categoria em: `src/Domain/Enums/CategoryType.cs`
2. Adicione os itens no repositório
3. Atualize os ícones e nomes de exibição em: `Controllers/HomeController.cs`

### Personalizar Estilo

Edite os arquivos:
- CSS: `wwwroot/css/site.css`
- JavaScript: `wwwroot/js/site.js`

## Estrutura de Código

### Camada de Domínio
Contém as entidades principais e regras de negócio fundamentais.

### Camada de Aplicação
Contém os serviços que orquestram a lógica de negócio.

### Camada de Infraestrutura
Contém implementações concretas e acesso a dados.

### Camada de Apresentação
Controllers e Views para a interface web.

## Licença

Projeto pessoal de automação.

## Autor

Jordan Lippert  
Desenvolvido para facilitar a criação de listas de compras e integração com WhatsApp.
