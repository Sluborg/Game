package com.majesty.idle.ui.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.majesty.idle.ui.component.BuildingCard
import com.majesty.idle.ui.component.GoldBar
import com.majesty.idle.ui.component.HeroPortrait
import com.majesty.idle.ui.component.MonsterThreatBanner
import com.majesty.idle.ui.theme.StoneDark
import com.majesty.idle.ui.viewmodel.KingdomViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KingdomScreen(viewModel: KingdomViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val offlineGold by viewModel.offlineGoldEarned.collectAsState()

    if (offlineGold > 0) {
        AlertDialog(
            onDismissRequest = viewModel::dismissOfflineNotice,
            title = { Text("Welcome Back!") },
            text = { Text("You earned ${offlineGold} gold while away.") },
            confirmButton = {
                TextButton(onClick = viewModel::dismissOfflineNotice) {
                    Text("Collect")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Majesty Idle", style = MaterialTheme.typography.headlineMedium) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = StoneDark)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            GoldBar(gold = state.gold, goldPerSecond = state.goldPerSecond)

            if (state.monsterGroups.isNotEmpty()) {
                MonsterThreatBanner(monsters = state.monsterGroups)
            }

            if (state.heroes.isNotEmpty()) {
                Text(
                    text = "Heroes",
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(state.heroes, key = { it.id }) { hero ->
                        HeroPortrait(hero = hero)
                    }
                }
            }

            Text(
                text = "Kingdom",
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            LazyColumn(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(state.buildings, key = { it.id }) { building ->
                    BuildingCard(
                        building = building,
                        playerGold = state.gold,
                        onUpgrade = { viewModel.upgradeBuilding(building.id) }
                    )
                }
            }
        }
    }
}
