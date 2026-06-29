#!/bin/bash

echo "🚀 SmartLogistics Taktiksel Komuta Merkezi Ayağa Kalkıyor..."

# Hayati Kural: Dashboard (ön plan) kapatıldığında arka plandaki her şeyi de temizle
trap 'kill 0' SIGINT

echo "📡 Bant Simülatörü arka planda dinlemeye alınıyor..."
dotnet run --project BandSimulator/BandSimulator.csproj &

echo "📦 Depo Simülatörü arka planda dinlemeye alınıyor..."
dotnet run --project DepotSimulator/DepotSimulator.csproj &

echo "🖥️ Amir Dashboard başlatılıyor..."
dotnet run --project SupervisorDashboard/SupervisorDashboard.csproj

# Arka plandaki işlemlerin bitmesini bekle (ki script kapanmasın)
wait