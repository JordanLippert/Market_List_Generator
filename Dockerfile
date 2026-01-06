# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# Copy csproj and restore as distinct layers
COPY Market_List_Generator/Market_List_Generator.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY Market_List_Generator/ ./
RUN dotnet publish -c Release -o out

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

# Copy published app
COPY --from=build /app/out .

# Copy Views and wwwroot
COPY --from=build /app/Presentation/WebApp/Views ./Presentation/WebApp/Views
COPY --from=build /app/Presentation/WebApp/wwwroot ./Presentation/WebApp/wwwroot

# Set environment variables
ENV ASPNETCORE_URLS=http://+:10000
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 10000

ENTRYPOINT ["dotnet", "Market_List_Generator.dll"]
