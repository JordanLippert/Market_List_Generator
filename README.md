# Market List Generator

Gerador de Lista de Compras com envio automático para WhatsApp!

## Descrição

Este é um projeto de automação pessoal desenvolvido em **C# e .NET 10** que permite criar rapidamente uma lista de compras através de uma interface web moderna e enviá-la formatada diretamente para o WhatsApp.

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
- .NET 10 SDK instalado

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
?   ?   ??? Index.cshtml
?   ??? _ViewStart.cshtml
?
??? wwwroot/                       # Arquivos est�ticos
?   ??? css/
?   ?   ??? site.css
?   ??? js/
?       ??? site.js
?
??? Properties/                    # Configura��es do projeto
?   ??? launchSettings.json
?
??? Program.cs                     # Ponto de entrada da aplica��o
??? appsettings.json              # Configura��es gerais
??? Market_List_Generator.csproj  # Arquivo do projeto
??? start.bat                     # Script de inicializa��o
??? README.md                     # Este arquivo
```

## Tecnologias Utilizadas

- **C# 14.0**
- **.NET 10**
- **ASP.NET Core MVC**
- **Razor Pages**
- **HTML5/CSS3**
- **JavaScript (Vanilla)**

## Exemplo de Mensagem Gerada

```
*LISTA DE COMPRAS*

*Gr�os e Panificados*
  - Arroz
  - Macarr�o
  - P�o

*Latic�nios e Ovos*
  - Leite
  - Ovos
  - Queijo

*Carnes*
  - Fil� de peito
  - Carne mo�da

*Hortifruti*
  - Alface
  - Tomate
  - Batata
```

## Personaliza��o

### Adicionar Novos Itens

Edite o arquivo: `src/Infrastructure/Repositories/ItemRepository.cs`

```csharp
new(ID, "Nome do Item", CategoryType.Categoria),
```

### Adicionar Novas Categorias

1. Adicione a categoria em: `src/Domain/Enums/CategoryType.cs`
2. Adicione os itens no reposit�rio
3. Atualize os �cones e nomes de exibi��o em: `Controllers/HomeController.cs`

### Personalizar Estilo

Edite os arquivos:
- CSS: `wwwroot/css/site.css`
- JavaScript: `wwwroot/js/site.js`

## Estrutura de C�digo

### Camada de Dom�nio
Cont�m as entidades principais e regras de neg�cio fundamentais.

### Camada de Aplica��o
Cont�m os servi�os que orquestram a l�gica de neg�cio.

### Camada de Infraestrutura
Cont�m implementa��es concretas e acesso a dados.

### Camada de Apresenta��o
Controllers e Views para a interface web.

## Licen�a

Projeto pessoal de automa��o.

## Autor

Jordan Lippert  
Desenvolvido para facilitar a cria��o de listas de compras e integra��o com WhatsApp.
