package com.kati.autologin;

import org.bukkit.Bukkit;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class WebShopAutoLogin extends JavaPlugin implements Listener {

    private String apiUrl;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        apiUrl = getConfig().getString("api_url", "https://pixel-kati.com/api-backend/api/server/verify-login");
        getServer().getPluginManager().registerEvents(this, this);
        getLogger().info("WebShopAutoLogin enabled! API URL: " + apiUrl);
    }

    @EventHandler
    public void onPlayerJoin(PlayerJoinEvent event) {
        String playerName = event.getPlayer().getName();
        
        // Run asynchronously so it doesn't freeze the server thread while making HTTP request
        Bukkit.getScheduler().runTaskAsynchronously(this, () -> {
            try {
                URL url = new URL(apiUrl + "?username=" + playerName);
                HttpURLConnection con = (HttpURLConnection) url.openConnection();
                con.setRequestMethod("GET");
                con.setConnectTimeout(5000);
                con.setReadTimeout(5000);

                int status = con.getResponseCode();
                if (status == 200) {
                    BufferedReader in = new BufferedReader(new InputStreamReader(con.getInputStream()));
                    String inputLine;
                    StringBuilder content = new StringBuilder();
                    while ((inputLine = in.readLine()) != null) {
                        content.append(inputLine);
                    }
                    in.close();

                    // If API returns {"valid":true}, we log them in
                    if (content.toString().contains("\"valid\":true")) {
                        // Must run command on main thread
                        Bukkit.getScheduler().runTask(this, () -> {
                            Bukkit.dispatchCommand(Bukkit.getConsoleSender(), "authme forcelogin " + playerName);
                            getLogger().info("Auto-logged in player: " + playerName);
                        });
                    }
                }
                con.disconnect();
            } catch (Exception e) {
                getLogger().warning("Failed to check auto-login for " + playerName + ": " + e.getMessage());
            }
        });
    }
}
