using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SupervisorDashboard.Migrations
{
    /// <inheritdoc />
    public partial class AddEtiketDepoIslem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EtiketDepoIslemleri",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    FirmaMarkasi = table.Column<string>(type: "TEXT", nullable: false),
                    Miktar = table.Column<int>(type: "INTEGER", nullable: false),
                    HedefBant = table.Column<string>(type: "TEXT", nullable: false),
                    IslemDurumu = table.Column<string>(type: "TEXT", nullable: false),
                    IslemZamani = table.Column<DateTime>(type: "TEXT", nullable: false),
                    TasiyiciAracId = table.Column<string>(type: "TEXT", nullable: false),
                    KalanSeviyeYuzde = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EtiketDepoIslemleri", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EtiketDepoIslemleri");
        }
    }
}
