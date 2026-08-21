using Blazored.LocalStorage;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using StaticBlaze.Admin;
using StaticBlaze.Admin.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(sp => new HttpClient());
builder.Services.AddBlazoredLocalStorage();

builder.Services.AddSingleton(builder.Configuration.GetSection("Github").Get<AdminConfig>() ?? new AdminConfig());
builder.Services.AddScoped<PatVaultService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<GitHubApiClient>();
builder.Services.AddScoped<PostService>();
builder.Services.AddScoped<MediaService>();
builder.Services.AddScoped<PreviewRenderer>();

await builder.Build().RunAsync();
