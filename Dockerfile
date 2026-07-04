# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# Node.js required by Microsoft.TypeScript.MSBuild to compile .ts sources
RUN apt-get update && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy csproj and restore as distinct layers
COPY Market_List_Generator/Market_List_Generator.csproj ./Market_List_Generator/
COPY shared/ ./shared/
WORKDIR /app/Market_List_Generator
RUN dotnet restore

# Copy everything else and build
COPY Market_List_Generator/ ./
RUN dotnet publish -c Release -o /app/out

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

# Copy published app (includes wwwroot and shared/catalog.json from publish)
COPY --from=build /app/out .

# Copy Views (not part of publish because they're outside csproj's wwwroot)
COPY --from=build /app/Market_List_Generator/Presentation/WebApp/Views ./Presentation/WebApp/Views

# Set environment variables
ENV ASPNETCORE_URLS=http://+:10000
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 10000

ENTRYPOINT ["dotnet", "Market_List_Generator.dll"]
