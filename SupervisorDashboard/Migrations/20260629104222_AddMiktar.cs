using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SupervisorDashboard.Migrations
{
    /// <inheritdoc />
    public partial class AddMiktar : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FactoryLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Topic = table.Column<string>(type: "TEXT", nullable: false),
                    Version = table.Column<string>(type: "TEXT", nullable: true),
                    AkuTipi = table.Column<string>(type: "TEXT", nullable: true),
                    RafKonumu = table.Column<string>(type: "TEXT", nullable: true),
                    HedefBant = table.Column<string>(type: "TEXT", nullable: true),
                    ForkliftId = table.Column<string>(type: "TEXT", nullable: true),
                    EtiketTipi = table.Column<string>(type: "TEXT", nullable: true),
                    Miktar = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FactoryLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "mamul_depo_islemleri",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    stok_kodu = table.Column<string>(type: "TEXT", nullable: true),
                    malzeme_aciklamasi = table.Column<string>(type: "TEXT", nullable: true),
                    lokasyon_no = table.Column<string>(type: "TEXT", nullable: true),
                    lokasyon_adi = table.Column<string>(type: "TEXT", nullable: true),
                    lot_grup_no = table.Column<string>(type: "TEXT", nullable: true),
                    ulke_seri_no = table.Column<string>(type: "TEXT", nullable: true),
                    hedef_bant = table.Column<string>(type: "TEXT", nullable: true),
                    islem_durumu = table.Column<string>(type: "TEXT", nullable: true),
                    miktar = table.Column<int>(type: "INTEGER", nullable: false),
                    islem_zamani = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mamul_depo_islemleri", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FactoryLogs");

            migrationBuilder.DropTable(
                name: "mamul_depo_islemleri");
        }
    }
}
