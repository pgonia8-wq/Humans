-- ============================================================================
  -- H TOKEN — SEED TEST DATA (safe, idempotent)
  -- 21 users, 38 tokens, holdings, activity, snapshots, airdrops, payments
  -- Bonding curve: price = 0.0000005 + 1.72e-20 * supply^2
  -- Run in Supabase SQL Editor (split into batches if needed)
  -- ============================================================================

  -- ─────────────────────────────────────────────
  -- 1. PROFILES — creates users if they dont exist
  -- ─────────────────────────────────────────────
  INSERT INTO profiles (id, username, verified, updated_at)
  VALUES ('usr_pgonia_01','pgonia',true,now())
  ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, verified=EXCLUDED.verified;
INSERT INTO profiles (id, username, verified, updated_at)
  VALUES ('usr_luna_02','luna_trader',true,now())
  ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, verified=EXCLUDED.verified;
INSERT INTO profiles (id, username, verified, updated_at)
  VALUES ('usr_max_03','max_alpha',true,now())
  ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, verified=EXCLUDED.verified;
INSERT INTO profiles (id, username, verified, updated_at)
  VALUES ('usr_sofia_04','sofia.eth',true,now())
  ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, verified=EXCLUDED.verified;
INSERT INTO profiles (id, username, verified, updated_at)
  VALUES ('usr_diego_05','diego_wld',true,now())
  ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, verified=EXCLUDED.verified;
INSERT INTO profiles (id, username, verified, updated_at)
  VALUES ('usr_mia_06','mia_crypto',true,now())
  ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, verified=EXCLUDED.verified;
INSERT INTO profiles (id, username, verified, updated_at)
  VALUES ('usr_carlos_07','carlos_moon',true,now())
  ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, verified=EXCLUDED.verified;
INSERT INTO profiles (id, username, verified, updated_at)
  VALUES ('usr_elena_08','elena_nft',true,now())
  ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, verified=EXCLUDED.verified;
INSERT INTO profiles (id, username, verified, updated_at)
  VALUES ('usr_jake_09','jake_diamond',false,now())
  ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, verified=EXCLUDED.verified;
INSERT INTO profiles (id, username, verified, updated_at)
  VALUES ('usr_nina_10','nina_degen',true,now())
  ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, verified=EXCLUDED.verified;
INSERT INTO profiles (id, username, verified, updated_at)
  VALUES ('usr_pablo_11','pablo_sol',true,now())
  ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, verified=EXCLUDED.verified;
INSERT INTO profiles (id, username, verified, updated_at)
  VALUES ('usr_anna_12','anna_hodl',true,now())
  ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, verified=EXCLUDED.verified;
INSERT INTO profiles (id, username, verified, updated_at)
  VALUES ('usr_tomas_13','tomas_dev',false,now())
  ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, verified=EXCLUDED.verified;
INSERT INTO profiles (id, username, verified, updated_at)
  VALUES ('usr_iris_14','iris_world',true,now())
  ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, verified=EXCLUDED.verified;
INSERT INTO profiles (id, username, verified, updated_at)
  VALUES ('usr_leo_15','leo_pump',true,now())
  ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, verified=EXCLUDED.verified;
INSERT INTO profiles (id, username, verified, updated_at)
  VALUES ('usr_val_16','val_builder',true,now())
  ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, verified=EXCLUDED.verified;
INSERT INTO profiles (id, username, verified, updated_at)
  VALUES ('usr_marco_17','marco_ape',true,now())
  ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, verified=EXCLUDED.verified;
INSERT INTO profiles (id, username, verified, updated_at)
  VALUES ('usr_sara_18','sara_gem',true,now())
  ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, verified=EXCLUDED.verified;
INSERT INTO profiles (id, username, verified, updated_at)
  VALUES ('usr_dan_19','dan_orbit',false,now())
  ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, verified=EXCLUDED.verified;
INSERT INTO profiles (id, username, verified, updated_at)
  VALUES ('usr_lucia_20','lucia_bag',true,now())
  ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, verified=EXCLUDED.verified;
INSERT INTO profiles (id, username, verified, updated_at)
  VALUES ('usr_rafa_21','rafa_whale',true,now())
  ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, verified=EXCLUDED.verified;

-- ─────────────────────────────────────────────
-- 2. TOKENS
-- ─────────────────────────────────────────────
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_wpepe','WorldPepe','WPEPE','🐸','usr_pgonia_01','pgonia',0.000035329999999999995,0.00010598999999999998,4769.5500,136,27.2475,15.3,245,100000000,45000000,'The first meme token on World Chain',true,'["Meme","Hot"]'::jsonb,72,544.950000,8.297668,false,5,now()-interval '21 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_mdust','MoonDust','MDUST','🌙','usr_pgonia_01','pgonia',0.0000029767999999999996,0.000008930399999999998,107.1648,22,0.7954,5.7,38,100000000,12000000,'Lunar vibes, infinite potential',false,'["New","Community"]'::jsonb,60,15.907200,0.291376,false,5,now()-interval '14 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_orbcoin','OrbCoin','ORBC','🔮','usr_pgonia_01','pgonia',0.0000666168,0.0001998504,12390.7248,185,69.8707,22.1,890,100000000,62000000,'Only verified humans',true,'["Blue Chip","Verified"]'::jsonb,81,1397.413867,24.179753,false,5,now()-interval '25 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_hyperh','HyperH','HYPH','⚡','usr_pgonia_01','pgonia',7.107e-7,0.0000021321000000000003,7.4623,9,0.0998,-2.1,12,100000000,3500000,'Speed matters. Built for H',false,'["New","Social"]'::jsonb,45,1.995817,0.039658,false,5,now()-interval '3 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_dhand','DiamondHands','DHAND','💎','usr_pgonia_01','pgonia',0.0000139848,0.0000419544,1174.7232,80,6.9929,8.9,156,100000000,28000000,'Never selling. Community of believers',true,'["Community","Diamond"]'::jsonb,68,139.858133,1.489395,false,5,now()-interval '18 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_solara','Solara','SOLAR','☀️','usr_luna_02','luna_trader',0.00005253,0.00015759,8667.4500,281,49.0692,18.5,520,100000000,55000000,'Solar-powered degens',true,'["Hot","Energy"]'::jsonb,77,981.383333,10.622329,false,5,now()-interval '22 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_nocturne','Nocturne','NOCT','🦇','usr_luna_02','luna_trader',0.0000016008,0.0000048024,38.4192,24,0.3468,3.2,22,100000000,8000000,'Night owls unite',false,'["New","Night"]'::jsonb,55,6.935467,0.099091,false,5,now()-interval '7 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_alpha','AlphaDAO','ALPHA','🧠','usr_max_03','max_alpha',0.000025336799999999998,0.0000760104,2888.3952,162,16.6800,12.4,310,100000000,38000000,'Governance for alpha hunters',true,'["DAO","Governance"]'::jsonb,70,333.599467,6.299236,false,5,now()-interval '20 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_apex','ApexRun','APEX','🏔️','usr_max_03','max_alpha',0.0000043700000000000005,0.000013110000000000002,196.6500,50,1.3425,6.8,67,100000000,15000000,'Race to the top',false,'["Gaming","Compete"]'::jsonb,62,26.850000,0.450042,false,5,now()-interval '10 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_rosa','RosaCoin','ROSA','🌹','usr_sofia_04','sofia.eth',0.0000088248,0.000026474400000000002,582.4368,86,3.6024,-1.5,44,100000000,22000000,'Beauty in decentralization',false,'["Art","Beauty"]'::jsonb,48,72.048533,1.050967,false,5,now()-interval '15 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_fuego','Fuego','FUEG','🔥','usr_diego_05','diego_wld',0.0000777108,0.00023313240000000002,15619.8708,157,87.8937,31.2,1100,100000000,67000000,'On fire. Unstoppable',true,'["Hot","Fire"]'::jsonb,88,1757.874533,19.247998,false,5,now()-interval '26 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_hielo','IceAge','ICE','🧊','usr_diego_05','diego_wld',9.3e-7,0.00000279,13.9500,32,0.1608,0.3,8,100000000,5000000,'Cool heads prevail',false,'["New","Chill"]'::jsonb,50,3.216667,0.041827,false,5,now()-interval '4 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_pixel','PixelWorld','PIXL','🎮','usr_mia_06','mia_crypto',0.0000192308,0.0000576924,1903.8492,67,11.1269,9.7,178,100000000,33000000,'Gaming meets DeFi',true,'["Gaming","Pixel"]'::jsonb,65,222.538800,4.109390,false,5,now()-interval '17 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_vibe','VibeCheck','VIBE','✨','usr_mia_06','mia_crypto',0.000008085199999999998,0.000024255599999999995,509.3676,34,3.1798,3.8,48,100000000,21000000,'Only good vibes',false,'["Community","Vibe"]'::jsonb,58,63.596400,0.933999,false,5,now()-interval '11 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_luna','LunarDAO','LNAO','🌕','usr_carlos_07','carlos_moon',0.0000308408,0.0000925224,3885.9408,86,22.2886,4.1,95,100000000,42000000,'Decentralized lunar fund',false,'["DAO","Space"]'::jsonb,58,445.771200,7.968388,false,5,now()-interval '19 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_crater','CraterCoin','CRTR','🕳️','usr_carlos_07','carlos_moon',5.387e-7,0.0000016161,2.4242,10,0.0385,-5.2,4,100000000,1500000,'From the depths',false,'["New","Deep"]'::jsonb,35,0.769350,0.011462,false,5,now()-interval '2 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_nftape','ApeNFT','ANFT','🦍','usr_elena_08','elena_nft',0.000040128799999999994,0.00012038639999999998,5778.5472,86,32.9030,14.8,380,100000000,48000000,'Apes together strong',true,'["NFT","Community"]'::jsonb,73,658.060800,7.205660,false,5,now()-interval '23 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_canvas','CanvasDAO','CNVS','🎨','usr_elena_08','elena_nft',0.0000060728,0.000018218399999999998,327.9312,69,2.1218,2.9,51,100000000,18000000,'Art governance',false,'["Art","DAO"]'::jsonb,56,42.436800,0.803812,false,5,now()-interval '12 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_yolo','YoloCoin','YOLO','🎲','usr_jake_09','jake_diamond',0.000047008799999999996,0.0001410264,7333.3728,172,41.6076,25.6,670,100000000,52000000,'You only live once',true,'["Meme","YOLO"]'::jsonb,82,832.152533,14.472149,false,5,now()-interval '24 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_zen','ZenToken','ZEN','🧘','usr_nina_10','nina_degen',0.0000121272,0.0000363816,945.9216,38,5.6885,1.8,35,100000000,26000000,'Find your inner peace',false,'["Wellness","Zen"]'::jsonb,52,113.769067,1.189339,false,5,now()-interval '13 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_chaos','ChaosDAO','CHAOS','🌀','usr_nina_10','nina_degen',0.00002802,0.00008406,3362.4000,105,19.3467,-3.4,88,100000000,40000000,'Embrace the chaos',false,'["DAO","Chaos"]'::jsonb,42,386.933333,7.409635,false,5,now()-interval '16 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_mate','MateCoin','MATE','🧉','usr_pablo_11','pablo_sol',0.0000067092,0.0000201276,382.4244,31,2.4412,7.3,62,100000000,19000000,'Fueled by mate',false,'["LatAm","Community"]'::jsonb,64,48.824933,0.933530,false,5,now()-interval '9 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_fomo','FomoCoin','FOMO','😱','usr_pablo_11','pablo_sol',0.0000563828,0.0001691484,9641.4588,149,54.5137,20.4,580,100000000,57000000,'Dont miss out',true,'["Meme","FOMO"]'::jsonb,79,1090.273200,21.093763,false,5,now()-interval '20 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_hodl','HodlForever','HODL','🫡','usr_anna_12','anna_hodl',0.00005836079999999999,0.0001750824,10154.7792,256,57.3821,11.2,430,100000000,58000000,'We dont sell. Period',true,'["Diamond","HODL"]'::jsonb,75,1147.642133,18.655531,false,5,now()-interval '22 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_devtool','DevTools','DEVT','🛠️','usr_tomas_13','tomas_dev',0.0000013428,0.0000040284,28.1988,23,0.2733,0.9,15,100000000,7000000,'Built by devs for devs',false,'["Dev","Tools"]'::jsonb,53,5.466533,0.088998,false,5,now()-interval '6 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_debug','DebugCoin','DBUG','🐛','usr_tomas_13','tomas_dev',5.688e-7,0.0000017063999999999999,3.4128,14,0.0523,-0.7,6,100000000,2000000,'Fix bugs earn tokens',false,'["New","Dev"]'::jsonb,47,1.045867,0.013521,false,5,now()-interval '3 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_globe','GlobeToken','GLBE','🌍','usr_iris_14','iris_world',0.00002157,0.00006471,2264.8500,162,13.1658,5.5,120,100000000,35000000,'One world one token',false,'["Global","UBI"]'::jsonb,61,263.316667,5.068318,false,5,now()-interval '18 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_rocket','RocketFuel','RKTF','🚀','usr_leo_15','leo_pump',0.00007095119999999999,0.00021285359999999998,13622.6304,284,76.7479,28.7,950,100000000,64000000,'Fueling the next moonshot',true,'["Hot","Rocket"]'::jsonb,85,1534.958933,17.808729,false,5,now()-interval '27 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_pump','PumpItUp','PUMP','💪','usr_leo_15','leo_pump',0.0000170292,0.000051087599999999995,1583.7156,146,9.3151,19.3,290,100000000,31000000,'Only up never down',true,'["Meme","Pump"]'::jsonb,74,186.301733,3.154883,false,5,now()-interval '15 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_brick','BrickByBrick','BRCK','🧱','usr_val_16','val_builder',0.0000038712,0.0000116136,162.5904,17,1.1366,3.6,42,100000000,14000000,'Building one block at a time',false,'["Build","Infra"]'::jsonb,57,22.732267,0.344212,false,5,now()-interval '8 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_banana','BananaCoin','BNNA','🍌','usr_marco_17','marco_ape',0.0000323028,0.00009690839999999999,4167.0612,130,23.8670,16.9,340,100000000,43000000,'Apes love bananas',true,'["Meme","Ape"]'::jsonb,71,477.340133,7.784633,false,5,now()-interval '19 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_jungle','JungleDAO','JNGL','🌴','usr_marco_17','marco_ape',0.0000018932,0.0000056796,51.1164,25,0.4340,4.5,28,100000000,9000000,'Welcome to the jungle',false,'["DAO","Wild"]'::jsonb,54,8.679600,0.167027,false,5,now()-interval '5 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_gem','HiddenGem','HGEM','💠','usr_sara_18','sara_gem',0.0000025812,0.0000077436,85.1796,36,0.6566,8.1,55,100000000,11000000,'The gem you were looking for',false,'["Alpha","Gem"]'::jsonb,63,13.131067,0.157831,false,5,now()-interval '7 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_orbit2','OrbitDAO','ORBT','🪐','usr_dan_19','dan_orbit',0.000024046799999999998,0.0000721404,2669.1948,104,15.4455,6.2,98,100000000,37000000,'Decentralized space governance',false,'["DAO","Space"]'::jsonb,59,308.910533,3.662033,false,5,now()-interval '16 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_bag','BagHolder','BAGS','💰','usr_lucia_20','lucia_bag',0.0000435,0.0001305,6525.0000,130,37.0833,13.5,410,100000000,50000000,'We hold bags with pride',true,'["Meme","Community"]'::jsonb,69,741.666667,7.506027,false,5,now()-interval '21 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_stack','StackSats','STAK','📚','usr_lucia_20','lucia_bag',7.752e-7,0.0000023256000000000002,9.3024,19,0.1183,1.2,10,100000000,4000000,'Stack tokens like books',false,'["New","Stack"]'::jsonb,51,2.366933,0.039758,false,5,now()-interval '4 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_whale','WhaleAlert','WHAL','🐋','usr_rafa_21','rafa_whale',0.0000823892,0.0002471676,17054.5644,211,95.8976,35.8,1500,100000000,69000000,'Only whales allowed',true,'["Whale","Hot"]'::jsonb,90,1917.951600,26.351685,false,5,now()-interval '28 days')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO tokens (id,name,symbol,emoji,creator_id,creator_name,price_wld,price_usdc,market_cap,holders,curve_percent,change_24h,volume_24h,total_supply,circulating_supply,description,is_trending,tags,buy_pressure,total_wld_in_curve,treasury_balance,graduated,creation_fee_wld,created_at)
  VALUES ('tok_shrimp','ShrimpCoin','SHRP','🦐','usr_rafa_21','rafa_whale',0.0000049032,0.000014709599999999999,235.3536,74,1.5742,2.3,33,100000000,16000000,'Small but mighty',false,'["Community","Small"]'::jsonb,55,31.483733,0.422692,false,5,now()-interval '10 days')
  ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 3. HOLDINGS (creator + 4 random holders per token)
-- ─────────────────────────────────────────────
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pgonia_01','tok_wpepe','WorldPepe','WPEPE','🐸',2518986,0.000017566699999999992,0.000035329999999999995,266.9873,134.2365,101.12,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_diego_05','tok_wpepe','WorldPepe','WPEPE','🐸',351027,0.000017566699999999992,0.000035329999999999995,37.2054,18.7062,101.12,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_dan_19','tok_wpepe','WorldPepe','WPEPE','🐸',278455,0.000017566699999999992,0.000035329999999999995,29.5134,14.8388,101.12,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_iris_14','tok_wpepe','WorldPepe','WPEPE','🐸',638135,0.000017566699999999992,0.000035329999999999995,67.6359,34.0062,101.12,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_lucia_20','tok_wpepe','WorldPepe','WPEPE','🐸',1279755,0.000017566699999999992,0.000035329999999999995,135.6412,68.1980,101.12,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pgonia_01','tok_mdust','MoonDust','MDUST','🌙',687597,0.000001713632,0.0000029767999999999996,6.1405,2.6057,73.71,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pablo_11','tok_mdust','MoonDust','MDUST','🌙',389465,0.000001713632,0.0000029767999999999996,3.4781,1.4759,73.71,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_diego_05','tok_mdust','MoonDust','MDUST','🌙',298968,0.000001713632,0.0000029767999999999996,2.6699,1.1329,73.71,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_leo_15','tok_mdust','MoonDust','MDUST','🌙',279134,0.000001713632,0.0000029767999999999996,2.4928,1.0578,73.71,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_marco_17','tok_mdust','MoonDust','MDUST','🌙',366390,0.000001713632,0.0000029767999999999996,3.2720,1.3884,73.71,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pgonia_01','tok_orbcoin','OrbCoin','ORBC','🔮',2618233,0.000032897231999999995,0.0000666168,523.2549,264.8571,102.50,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_leo_15','tok_orbcoin','OrbCoin','ORBC','🔮',1214809,0.000032897231999999995,0.0000666168,242.7801,122.8885,102.50,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_val_16','tok_orbcoin','OrbCoin','ORBC','🔮',1578881,0.000032897231999999995,0.0000666168,315.5400,159.7176,102.50,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_dan_19','tok_orbcoin','OrbCoin','ORBC','🔮',665069,0.000032897231999999995,0.0000666168,132.9143,67.2775,102.50,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_diego_05','tok_orbcoin','OrbCoin','ORBC','🔮',480787,0.000032897231999999995,0.0000666168,96.0855,48.6358,102.50,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pgonia_01','tok_hyperh','HyperH','HYPH','⚡',92496,6.032429999999999e-7,7.107e-7,0.1972,0.0298,17.81,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pablo_11','tok_hyperh','HyperH','HYPH','⚡',43219,6.032429999999999e-7,7.107e-7,0.0921,0.0139,17.81,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_nina_10','tok_hyperh','HyperH','HYPH','⚡',23852,6.032429999999999e-7,7.107e-7,0.0509,0.0077,17.81,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_jake_09','tok_hyperh','HyperH','HYPH','⚡',69908,6.032429999999999e-7,7.107e-7,0.1491,0.0225,17.81,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_diego_05','tok_hyperh','HyperH','HYPH','⚡',73357,6.032429999999999e-7,7.107e-7,0.1564,0.0236,17.81,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pgonia_01','tok_dhand','DiamondHands','DHAND','💎',1522791,0.000007107552,0.0000139848,63.8878,31.4178,96.76,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_anna_12','tok_dhand','DiamondHands','DHAND','💎',455744,0.000007107552,0.0000139848,19.1205,9.4028,96.76,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pablo_11','tok_dhand','DiamondHands','DHAND','💎',594497,0.000007107552,0.0000139848,24.9418,12.2655,96.76,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_lucia_20','tok_dhand','DiamondHands','DHAND','💎',658093,0.000007107552,0.0000139848,27.6099,13.5776,96.76,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_val_16','tok_dhand','DiamondHands','DHAND','💎',816423,0.000007107552,0.0000139848,34.2525,16.8442,96.76,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_luna_02','tok_solara','Solara','SOLAR','☀️',3560875,0.000025994699999999997,0.00005253,561.1583,283.4667,102.08,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_sofia_04','tok_solara','Solara','SOLAR','☀️',505124,0.000025994699999999997,0.00005253,79.6025,40.2109,102.08,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pgonia_01','tok_solara','Solara','SOLAR','☀️',1789681,0.000025994699999999997,0.00005253,282.0358,142.4692,102.08,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_dan_19','tok_solara','Solara','SOLAR','☀️',542284,0.000025994699999999997,0.00005253,85.4585,43.1690,102.08,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_val_16','tok_solara','Solara','SOLAR','☀️',964819,0.000025994699999999997,0.00005253,152.0458,76.8053,102.08,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_luna_02','tok_nocturne','Nocturne','NOCT','🦇',382624,0.000001039392,0.0000016008,1.8375,0.6444,54.01,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_iris_14','tok_nocturne','Nocturne','NOCT','🦇',180915,0.000001039392,0.0000016008,0.8688,0.3047,54.01,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_jake_09','tok_nocturne','Nocturne','NOCT','🦇',60373,0.000001039392,0.0000016008,0.2899,0.1017,54.01,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_rafa_21','tok_nocturne','Nocturne','NOCT','🦇',189296,0.000001039392,0.0000016008,0.9091,0.3188,54.01,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_lucia_20','tok_nocturne','Nocturne','NOCT','🦇',162738,0.000001039392,0.0000016008,0.7815,0.2741,54.01,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_max_03','tok_alpha','AlphaDAO','ALPHA','🧠',2163913,0.000012670032,0.000025336799999999998,164.4799,82.2294,99.97,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_diego_05','tok_alpha','AlphaDAO','ALPHA','🧠',1133170,0.000012670032,0.000025336799999999998,86.1327,43.0608,99.97,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_mia_06','tok_alpha','AlphaDAO','ALPHA','🧠',870598,0.000012670032,0.000025336799999999998,66.1745,33.0830,99.97,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_leo_15','tok_alpha','AlphaDAO','ALPHA','🧠',359544,0.000012670032,0.000025336799999999998,27.3291,13.6628,99.97,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_dan_19','tok_alpha','AlphaDAO','ALPHA','🧠',266039,0.000012670032,0.000025336799999999998,20.2217,10.1096,99.97,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_max_03','tok_apex','ApexRun','APEX','🏔️',709783,0.0000023963,0.0000043700000000000005,9.3053,4.2027,82.36,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_val_16','tok_apex','ApexRun','APEX','🏔️',290302,0.0000023963,0.0000043700000000000005,3.8059,1.7189,82.36,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pgonia_01','tok_apex','ApexRun','APEX','🏔️',414432,0.0000023963,0.0000043700000000000005,5.4332,2.4539,82.36,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_jake_09','tok_apex','ApexRun','APEX','🏔️',314581,0.0000023963,0.0000043700000000000005,4.1242,1.8627,82.36,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_nina_10','tok_apex','ApexRun','APEX','🏔️',309015,0.0000023963,0.0000043700000000000005,4.0512,1.8297,82.36,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_sofia_04','tok_rosa','RosaCoin','ROSA','🌹',1010955,0.000004579152,0.0000088248,26.7644,12.8765,92.72,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pgonia_01','tok_rosa','RosaCoin','ROSA','🌹',429418,0.000004579152,0.0000088248,11.3686,5.4695,92.72,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_luna_02','tok_rosa','RosaCoin','ROSA','🌹',767593,0.000004579152,0.0000088248,20.3216,9.7768,92.72,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_anna_12','tok_rosa','RosaCoin','ROSA','🌹',173717,0.000004579152,0.0000088248,4.5991,2.2126,92.72,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_max_03','tok_rosa','RosaCoin','ROSA','🌹',702423,0.000004579152,0.0000088248,18.5962,8.9467,92.72,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_diego_05','tok_fuego','Fuego','FUEG','🔥',3449338,0.000038333292,0.0000777108,804.1524,407.4790,102.72,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_sara_18','tok_fuego','Fuego','FUEG','🔥',1009332,0.000038333292,0.0000777108,235.3080,119.2349,102.72,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_mia_06','tok_fuego','Fuego','FUEG','🔥',420319,0.000038333292,0.0000777108,97.9900,49.6533,102.72,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_dan_19','tok_fuego','Fuego','FUEG','🔥',659583,0.000038333292,0.0000777108,153.7702,77.9182,102.72,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_carlos_07','tok_fuego','Fuego','FUEG','🔥',1030107,0.000038333292,0.0000777108,240.1513,121.6891,102.72,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_diego_05','tok_hielo','IceAge','ICE','🧊',139005,7.107e-7,9.3e-7,0.3878,0.0915,30.86,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_leo_15','tok_hielo','IceAge','ICE','🧊',154452,7.107e-7,9.3e-7,0.4309,0.1016,30.86,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_marco_17','tok_hielo','IceAge','ICE','🧊',122700,7.107e-7,9.3e-7,0.3423,0.0807,30.86,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_tomas_13','tok_hielo','IceAge','ICE','🧊',122416,7.107e-7,9.3e-7,0.3415,0.0805,30.86,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_nina_10','tok_hielo','IceAge','ICE','🧊',174242,7.107e-7,9.3e-7,0.4861,0.1146,30.86,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_mia_06','tok_pixel','PixelWorld','PIXL','🎮',666657,0.000009678092,0.0000192308,38.4610,19.1051,98.70,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_diego_05','tok_pixel','PixelWorld','PIXL','🎮',814881,0.000009678092,0.0000192308,47.0124,23.3530,98.70,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pgonia_01','tok_pixel','PixelWorld','PIXL','🎮',215900,0.000009678092,0.0000192308,12.4558,6.1873,98.70,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_elena_08','tok_pixel','PixelWorld','PIXL','🎮',1060728,0.000009678092,0.0000192308,61.1959,30.3985,98.70,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_dan_19','tok_pixel','PixelWorld','PIXL','🎮',442631,0.000009678092,0.0000192308,25.5364,12.6850,98.70,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_mia_06','tok_vibe','VibeCheck','VIBE','✨',1498099,0.0000042167479999999994,0.000008085199999999998,36.3373,17.3860,91.74,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_iris_14','tok_vibe','VibeCheck','VIBE','✨',422612,0.0000042167479999999994,0.000008085199999999998,10.2507,4.9046,91.74,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_sara_18','tok_vibe','VibeCheck','VIBE','✨',261906,0.0000042167479999999994,0.000008085199999999998,6.3527,3.0395,91.74,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_dan_19','tok_vibe','VibeCheck','VIBE','✨',635392,0.0000042167479999999994,0.000008085199999999998,15.4118,7.3740,91.74,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_tomas_13','tok_vibe','VibeCheck','VIBE','✨',452133,0.0000042167479999999994,0.000008085199999999998,10.9668,5.2472,91.74,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_carlos_07','tok_luna','LunarDAO','LNAO','🌕',2692801,0.000015366991999999995,0.0000308408,249.1444,125.0037,100.70,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_diego_05','tok_luna','LunarDAO','LNAO','🌕',651004,0.000015366991999999995,0.0000308408,60.2325,30.2205,100.70,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_jake_09','tok_luna','LunarDAO','LNAO','🌕',1111121,0.000015366991999999995,0.0000308408,102.8036,51.5798,100.70,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_tomas_13','tok_luna','LunarDAO','LNAO','🌕',1441306,0.000015366991999999995,0.0000308408,133.3531,66.9075,100.70,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_luna_02','tok_luna','LunarDAO','LNAO','🌕',317948,0.000015366991999999995,0.0000308408,29.4173,14.7596,100.70,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_carlos_07','tok_crater','CraterCoin','CRTR','🕳️',105786,5.18963e-7,5.387e-7,0.1710,0.0063,3.80,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_luna_02','tok_crater','CraterCoin','CRTR','🕳️',25629,5.18963e-7,5.387e-7,0.0414,0.0015,3.80,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_sofia_04','tok_crater','CraterCoin','CRTR','🕳️',34183,5.18963e-7,5.387e-7,0.0552,0.0020,3.80,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_anna_12','tok_crater','CraterCoin','CRTR','🕳️',31915,5.18963e-7,5.387e-7,0.0516,0.0019,3.80,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_rafa_21','tok_crater','CraterCoin','CRTR','🕳️',18201,5.18963e-7,5.387e-7,0.0294,0.0011,3.80,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_elena_08','tok_nftape','ApeNFT','ANFT','🦍',2225658,0.000019918111999999998,0.000040128799999999994,267.9390,134.9462,101.47,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_marco_17','tok_nftape','ApeNFT','ANFT','🦍',1335459,0.000019918111999999998,0.000040128799999999994,160.7711,80.9716,101.47,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_tomas_13','tok_nftape','ApeNFT','ANFT','🦍',250634,0.000019918111999999998,0.000040128799999999994,30.1729,15.1965,101.47,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_carlos_07','tok_nftape','ApeNFT','ANFT','🦍',415438,0.000019918111999999998,0.000040128799999999994,50.0131,25.1889,101.47,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_rafa_21','tok_nftape','ApeNFT','ANFT','🦍',664668,0.000019918111999999998,0.000040128799999999994,80.0170,40.3002,101.47,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_elena_08','tok_canvas','CanvasDAO','CNVS','🎨',655609,0.0000032306719999999995,0.0000060728,11.9441,5.5900,87.97,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_val_16','tok_canvas','CanvasDAO','CNVS','🎨',270651,0.0000032306719999999995,0.0000060728,4.9308,2.3077,87.97,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_max_03','tok_canvas','CanvasDAO','CNVS','🎨',236555,0.0000032306719999999995,0.0000060728,4.3097,2.0170,87.97,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_tomas_13','tok_canvas','CanvasDAO','CNVS','🎨',357381,0.0000032306719999999995,0.0000060728,6.5109,3.0472,87.97,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_sara_18','tok_canvas','CanvasDAO','CNVS','🎨',395231,0.0000032306719999999995,0.0000060728,7.2005,3.3699,87.97,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_jake_09','tok_yolo','YoloCoin','YOLO','🎲',2754566,0.000023289311999999997,0.000047008799999999996,388.4665,196.0107,101.85,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_leo_15','tok_yolo','YoloCoin','YOLO','🎲',768298,0.000023289311999999997,0.000047008799999999996,108.3503,54.6709,101.85,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_anna_12','tok_yolo','YoloCoin','YOLO','🎲',1550453,0.000023289311999999997,0.000047008799999999996,218.6548,110.3279,101.85,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_carlos_07','tok_yolo','YoloCoin','YOLO','🎲',422632,0.000023289311999999997,0.000047008799999999996,59.6023,30.0738,101.85,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_dan_19','tok_yolo','YoloCoin','YOLO','🎲',531424,0.000023289311999999997,0.000047008799999999996,74.9448,37.8153,101.85,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_nina_10','tok_zen','ZenToken','ZEN','🧘',2017376,0.000006197328,0.0000121272,73.3954,35.8883,95.68,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_anna_12','tok_zen','ZenToken','ZEN','🧘',707797,0.000006197328,0.0000121272,25.7508,12.5914,95.68,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_elena_08','tok_zen','ZenToken','ZEN','🧘',608681,0.000006197328,0.0000121272,22.1448,10.8282,95.68,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_lucia_20','tok_zen','ZenToken','ZEN','🧘',297472,0.000006197328,0.0000121272,10.8225,5.2919,95.68,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_diego_05','tok_zen','ZenToken','ZEN','🧘',551961,0.000006197328,0.0000121272,20.0812,9.8192,95.68,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_nina_10','tok_chaos','ChaosDAO','CHAOS','🌀',2091628,0.0000139848,0.00002802,175.8222,88.0693,100.36,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_lucia_20','tok_chaos','ChaosDAO','CHAOS','🌀',506947,0.0000139848,0.00002802,42.6140,21.3453,100.36,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_mia_06','tok_chaos','ChaosDAO','CHAOS','🌀',329692,0.0000139848,0.00002802,27.7139,13.8819,100.36,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_sofia_04','tok_chaos','ChaosDAO','CHAOS','🌀',270460,0.0000139848,0.00002802,22.7349,11.3879,100.36,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_leo_15','tok_chaos','ChaosDAO','CHAOS','🌀',1016207,0.0000139848,0.00002802,85.4224,42.7880,100.36,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pablo_11','tok_mate','MateCoin','MATE','🧉',1369170,0.0000035425079999999998,0.0000067092,27.5581,13.0072,89.39,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_mia_06','tok_mate','MateCoin','MATE','🧉',502319,0.0000035425079999999998,0.0000067092,10.1105,4.7721,89.39,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_anna_12','tok_mate','MateCoin','MATE','🧉',555740,0.0000035425079999999998,0.0000067092,11.1857,5.2796,89.39,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_rafa_21','tok_mate','MateCoin','MATE','🧉',533557,0.0000035425079999999998,0.0000067092,10.7392,5.0688,89.39,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_val_16','tok_mate','MateCoin','MATE','🧉',140475,0.0000035425079999999998,0.0000067092,2.8274,1.3345,89.39,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pablo_11','tok_fomo','FomoCoin','FOMO','😱',2707420,0.000027882571999999996,0.0000563828,457.9558,231.4863,102.22,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_elena_08','tok_fomo','FomoCoin','FOMO','😱',1889023,0.000027882571999999996,0.0000563828,319.5252,161.5128,102.22,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_mia_06','tok_fomo','FomoCoin','FOMO','😱',467498,0.000027882571999999996,0.0000563828,79.0765,39.9714,102.22,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_nina_10','tok_fomo','FomoCoin','FOMO','😱',1662130,0.000027882571999999996,0.0000563828,281.1466,142.1133,102.22,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_dan_19','tok_fomo','FomoCoin','FOMO','😱',1718173,0.000027882571999999996,0.0000563828,290.6262,146.9050,102.22,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_anna_12','tok_hodl','HodlForever','HODL','🫡',3187423,0.000028851792,0.00005836079999999999,558.0617,282.1731,102.28,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_elena_08','tok_hodl','HodlForever','HODL','🫡',1169231,0.000028851792,0.00005836079999999999,204.7118,103.5085,102.28,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_jake_09','tok_hodl','HodlForever','HODL','🫡',1004955,0.000028851792,0.00005836079999999999,175.9499,88.9657,102.28,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_carlos_07','tok_hodl','HodlForever','HODL','🫡',438644,0.000028851792,0.00005836079999999999,76.7988,38.8318,102.28,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pgonia_01','tok_hodl','HodlForever','HODL','🫡',575606,0.000028851792,0.00005836079999999999,100.7785,50.9567,102.28,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_tomas_13','tok_devtool','DevTools','DEVT','🛠️',340835,9.12972e-7,0.0000013428,1.3730,0.4395,47.08,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_luna_02','tok_devtool','DevTools','DEVT','🛠️',77430,9.12972e-7,0.0000013428,0.3119,0.0998,47.08,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_anna_12','tok_devtool','DevTools','DEVT','🛠️',87568,9.12972e-7,0.0000013428,0.3528,0.1129,47.08,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_marco_17','tok_devtool','DevTools','DEVT','🛠️',128803,9.12972e-7,0.0000013428,0.5189,0.1661,47.08,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_sara_18','tok_devtool','DevTools','DEVT','🛠️',76678,9.12972e-7,0.0000013428,0.3089,0.0989,47.08,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_tomas_13','tok_debug','DebugCoin','DBUG','🐛',108625,5.33712e-7,5.688e-7,0.1854,0.0114,6.57,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pgonia_01','tok_debug','DebugCoin','DBUG','🐛',26380,5.33712e-7,5.688e-7,0.0450,0.0028,6.57,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_luna_02','tok_debug','DebugCoin','DBUG','🐛',35530,5.33712e-7,5.688e-7,0.0606,0.0037,6.57,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_iris_14','tok_debug','DebugCoin','DBUG','🐛',28540,5.33712e-7,5.688e-7,0.0487,0.0030,6.57,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_max_03','tok_debug','DebugCoin','DBUG','🐛',67542,5.33712e-7,5.688e-7,0.1153,0.0071,6.57,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_iris_14','tok_globe','GlobeToken','GLBE','🌍',1515542,0.0000108243,0.00002157,98.0707,48.8567,99.27,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pgonia_01','tok_globe','GlobeToken','GLBE','🌍',856187,0.0000108243,0.00002157,55.4039,27.6010,99.27,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_max_03','tok_globe','GlobeToken','GLBE','🌍',1114751,0.0000108243,0.00002157,72.1355,35.9363,99.27,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_sara_18','tok_globe','GlobeToken','GLBE','🌍',851601,0.0000108243,0.00002157,55.1071,27.4531,99.27,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_elena_08','tok_globe','GlobeToken','GLBE','🌍',630990,0.0000108243,0.00002157,40.8314,20.3413,99.27,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_leo_15','tok_rocket','RocketFuel','RKTF','🚀',2315857,0.000035021087999999996,0.00007095119999999999,492.9385,249.6270,102.60,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_tomas_13','tok_rocket','RocketFuel','RKTF','🚀',1279498,0.000035021087999999996,0.00007095119999999999,272.3458,137.9175,102.60,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_carlos_07','tok_rocket','RocketFuel','RKTF','🚀',1184760,0.000035021087999999996,0.00007095119999999999,252.1804,127.7057,102.60,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pgonia_01','tok_rocket','RocketFuel','RKTF','🚀',1660137,0.000035021087999999996,0.00007095119999999999,353.3661,178.9467,102.60,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_marco_17','tok_rocket','RocketFuel','RKTF','🚀',1154285,0.000035021087999999996,0.00007095119999999999,245.6937,124.4208,102.60,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_leo_15','tok_pump','PumpItUp','PUMP','💪',804270,0.000008599308,0.0000170292,41.0882,20.3397,98.03,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_luna_02','tok_pump','PumpItUp','PUMP','💪',556733,0.000008599308,0.0000170292,28.4422,14.0796,98.03,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_mia_06','tok_pump','PumpItUp','PUMP','💪',636707,0.000008599308,0.0000170292,32.5278,16.1021,98.03,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pablo_11','tok_pump','PumpItUp','PUMP','💪',1017066,0.000008599308,0.0000170292,51.9595,25.7213,98.03,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_elena_08','tok_pump','PumpItUp','PUMP','💪',1063518,0.000008599308,0.0000170292,54.3326,26.8960,98.03,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_val_16','tok_brick','BrickByBrick','BRCK','🧱',656116,0.0000021518879999999998,0.0000038712,7.6199,3.3842,79.90,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_leo_15','tok_brick','BrickByBrick','BRCK','🧱',410783,0.0000021518879999999998,0.0000038712,4.7707,2.1188,79.90,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_tomas_13','tok_brick','BrickByBrick','BRCK','🧱',230901,0.0000021518879999999998,0.0000038712,2.6816,1.1910,79.90,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_rafa_21','tok_brick','BrickByBrick','BRCK','🧱',72134,0.0000021518879999999998,0.0000038712,0.8377,0.3721,79.90,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pgonia_01','tok_brick','BrickByBrick','BRCK','🧱',322869,0.0000021518879999999998,0.0000038712,3.7497,1.6653,79.90,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_marco_17','tok_banana','BananaCoin','BNNA','🍌',1570478,0.000016083371999999996,0.0000323028,152.1925,76.4168,100.85,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_dan_19','tok_banana','BananaCoin','BNNA','🍌',575514,0.000016083371999999996,0.0000323028,55.7721,28.0035,100.85,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pgonia_01','tok_banana','BananaCoin','BNNA','🍌',551526,0.000016083371999999996,0.0000323028,53.4475,26.8363,100.85,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_luna_02','tok_banana','BananaCoin','BNNA','🍌',1010652,0.000016083371999999996,0.0000323028,97.9407,49.1766,100.85,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_mia_06','tok_banana','BananaCoin','BNNA','🍌',503751,0.000016083371999999996,0.0000323028,48.8177,24.5117,100.85,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_marco_17','tok_jungle','JungleDAO','JNGL','🌴',599641,0.0000011826679999999999,0.0000018932,3.4057,1.2782,60.08,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_mia_06','tok_jungle','JungleDAO','JNGL','🌴',116953,0.0000011826679999999999,0.0000018932,0.6642,0.2493,60.08,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_rafa_21','tok_jungle','JungleDAO','JNGL','🌴',121442,0.0000011826679999999999,0.0000018932,0.6897,0.2589,60.08,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_max_03','tok_jungle','JungleDAO','JNGL','🌴',301998,0.0000011826679999999999,0.0000018932,1.7152,0.6437,60.08,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_luna_02','tok_jungle','JungleDAO','JNGL','🌴',202669,0.0000011826679999999999,0.0000018932,1.1511,0.4320,60.08,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_sara_18','tok_gem','HiddenGem','HGEM','💠',221377,0.000001519788,0.0000025812,1.7143,0.7049,69.84,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pgonia_01','tok_gem','HiddenGem','HGEM','💠',173496,0.000001519788,0.0000025812,1.3435,0.5525,69.84,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_luna_02','tok_gem','HiddenGem','HGEM','💠',89372,0.000001519788,0.0000025812,0.6921,0.2846,69.84,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pablo_11','tok_gem','HiddenGem','HGEM','💠',150639,0.000001519788,0.0000025812,1.1665,0.4797,69.84,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_diego_05','tok_gem','HiddenGem','HGEM','💠',199396,0.000001519788,0.0000025812,1.5440,0.6349,69.84,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_dan_19','tok_orbit2','OrbitDAO','ORBT','🪐',1189715,0.000012037932,0.000024046799999999998,85.8265,42.8614,99.76,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_carlos_07','tok_orbit2','OrbitDAO','ORBT','🪐',820242,0.000012037932,0.000024046799999999998,59.1726,29.5505,99.76,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_mia_06','tok_orbit2','OrbitDAO','ORBT','🪐',539489,0.000012037932,0.000024046799999999998,38.9190,19.4360,99.76,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_anna_12','tok_orbit2','OrbitDAO','ORBT','🪐',616402,0.000012037932,0.000024046799999999998,44.4675,22.2069,99.76,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_sara_18','tok_orbit2','OrbitDAO','ORBT','🪐',277509,0.000012037932,0.000024046799999999998,20.0196,9.9977,99.76,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_lucia_20','tok_bag','BagHolder','BAGS','💰',3527003,0.00002157,0.0000435,460.2739,232.0415,101.67,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_leo_15','tok_bag','BagHolder','BAGS','💰',999335,0.00002157,0.0000435,130.4132,65.7462,101.67,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_jake_09','tok_bag','BagHolder','BAGS','💰',1384207,0.00002157,0.0000435,180.6390,91.0670,101.67,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_marco_17','tok_bag','BagHolder','BAGS','💰',1510346,0.00002157,0.0000435,197.1002,99.3657,101.67,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_sofia_04','tok_bag','BagHolder','BAGS','💰',1566766,0.00002157,0.0000435,204.4630,103.0775,101.67,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_lucia_20','tok_stack','StackSats','STAK','📚',98454,6.34848e-7,7.752e-7,0.2290,0.0415,22.11,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_sofia_04','tok_stack','StackSats','STAK','📚',76157,6.34848e-7,7.752e-7,0.1771,0.0321,22.11,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_tomas_13','tok_stack','StackSats','STAK','📚',87138,6.34848e-7,7.752e-7,0.2026,0.0367,22.11,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_leo_15','tok_stack','StackSats','STAK','📚',72810,6.34848e-7,7.752e-7,0.1693,0.0307,22.11,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_max_03','tok_stack','StackSats','STAK','📚',99849,6.34848e-7,7.752e-7,0.2322,0.0420,22.11,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_rafa_21','tok_whale','WhaleAlert','WHAL','🐋',3073454,0.000040625707999999995,0.0000823892,759.6582,385.0745,102.80,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_pgonia_01','tok_whale','WhaleAlert','WHAL','🐋',659513,0.000040625707999999995,0.0000823892,163.0102,82.6307,102.80,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_elena_08','tok_whale','WhaleAlert','WHAL','🐋',603996,0.000040625707999999995,0.0000823892,149.2882,75.6749,102.80,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_luna_02','tok_whale','WhaleAlert','WHAL','🐋',538925,0.000040625707999999995,0.0000823892,133.2048,67.5222,102.80,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_leo_15','tok_whale','WhaleAlert','WHAL','🐋',610452,0.000040625707999999995,0.0000823892,150.8840,76.4838,102.80,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_rafa_21','tok_shrimp','ShrimpCoin','SHRP','🦐',1135148,0.0000026575679999999997,0.0000049032,16.6976,7.6474,84.50,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_lucia_20','tok_shrimp','ShrimpCoin','SHRP','🦐',220688,0.0000026575679999999997,0.0000049032,3.2462,1.4868,84.50,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_sofia_04','tok_shrimp','ShrimpCoin','SHRP','🦐',478577,0.0000026575679999999997,0.0000049032,7.0397,3.2241,84.50,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_elena_08','tok_shrimp','ShrimpCoin','SHRP','🦐',366787,0.0000026575679999999997,0.0000049032,5.3953,2.4710,84.50,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();
INSERT INTO holdings (user_id,token_id,token_name,token_symbol,token_emoji,amount,avg_buy_price,current_price,value,pnl,pnl_percent,updated_at)
  VALUES ('usr_anna_12','tok_shrimp','ShrimpCoin','SHRP','🦐',502686,0.0000026575679999999997,0.0000049032,7.3943,3.3865,84.50,now())
  ON CONFLICT (user_id,token_id) DO UPDATE SET amount=EXCLUDED.amount,current_price=EXCLUDED.current_price,value=EXCLUDED.value,pnl=EXCLUDED.pnl,pnl_percent=EXCLUDED.pnl_percent,updated_at=now();

-- ─────────────────────────────────────────────
-- 4. ACTIVITY (create + 4 trades per token)
-- ─────────────────────────────────────────────
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_pgonia_01','pgonia','tok_wpepe','WPEPE',45000000,0.000035329999999999995,5,now()-interval '21 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_jake_09','jake_diamond','tok_wpepe','WPEPE',291900,0.000035329999999999995,3.4088,now()-interval '246 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_anna_12','anna_hodl','tok_wpepe','WPEPE',373392,0.000035329999999999995,3.1801,now()-interval '7 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_sara_18','sara_gem','tok_wpepe','WPEPE',304941,0.000035329999999999995,11.6956,now()-interval '83 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_lucia_20','lucia_bag','tok_wpepe','WPEPE',48951,0.000035329999999999995,2.2668,now()-interval '217 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_pgonia_01','pgonia','tok_mdust','MDUST',12000000,0.0000029767999999999996,5,now()-interval '14 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_max_03','max_alpha','tok_mdust','MDUST',82997,0.0000029767999999999996,12.4096,now()-interval '333 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_pgonia_01','pgonia','tok_mdust','MDUST',187094,0.0000029767999999999996,10.2712,now()-interval '117 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_max_03','max_alpha','tok_mdust','MDUST',261101,0.0000029767999999999996,10.9576,now()-interval '194 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_lucia_20','lucia_bag','tok_mdust','MDUST',316416,0.0000029767999999999996,12.3813,now()-interval '255 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_pgonia_01','pgonia','tok_orbcoin','ORBC',62000000,0.0000666168,5,now()-interval '25 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_leo_15','leo_pump','tok_orbcoin','ORBC',398540,0.0000666168,7.0780,now()-interval '331 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_dan_19','dan_orbit','tok_orbcoin','ORBC',192556,0.0000666168,3.7145,now()-interval '434 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_nina_10','nina_degen','tok_orbcoin','ORBC',199525,0.0000666168,5.5203,now()-interval '190 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_leo_15','leo_pump','tok_orbcoin','ORBC',313938,0.0000666168,11.6110,now()-interval '19 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_pgonia_01','pgonia','tok_hyperh','HYPH',3500000,7.107e-7,5,now()-interval '3 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_mia_06','mia_crypto','tok_hyperh','HYPH',398137,7.107e-7,1.9100,now()-interval '55 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_luna_02','luna_trader','tok_hyperh','HYPH',376475,7.107e-7,3.8340,now()-interval '27 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_iris_14','iris_world','tok_hyperh','HYPH',376525,7.107e-7,11.7128,now()-interval '68 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_leo_15','leo_pump','tok_hyperh','HYPH',153321,7.107e-7,4.5834,now()-interval '41 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_pgonia_01','pgonia','tok_dhand','DHAND',28000000,0.0000139848,5,now()-interval '18 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_iris_14','iris_world','tok_dhand','DHAND',293527,0.0000139848,7.6058,now()-interval '404 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_elena_08','elena_nft','tok_dhand','DHAND',357567,0.0000139848,7.7956,now()-interval '216 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_tomas_13','tomas_dev','tok_dhand','DHAND',255199,0.0000139848,4.4426,now()-interval '38 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_sara_18','sara_gem','tok_dhand','DHAND',119214,0.0000139848,1.4095,now()-interval '193 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_luna_02','luna_trader','tok_solara','SOLAR',55000000,0.00005253,5,now()-interval '22 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_anna_12','anna_hodl','tok_solara','SOLAR',75841,0.00005253,4.5788,now()-interval '363 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_dan_19','dan_orbit','tok_solara','SOLAR',132586,0.00005253,6.8046,now()-interval '223 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_jake_09','jake_diamond','tok_solara','SOLAR',16479,0.00005253,7.2374,now()-interval '73 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_rafa_21','rafa_whale','tok_solara','SOLAR',331428,0.00005253,12.2828,now()-interval '113 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_luna_02','luna_trader','tok_nocturne','NOCT',8000000,0.0000016008,5,now()-interval '7 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_carlos_07','carlos_moon','tok_nocturne','NOCT',80656,0.0000016008,9.0755,now()-interval '142 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_elena_08','elena_nft','tok_nocturne','NOCT',183053,0.0000016008,7.2599,now()-interval '161 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_tomas_13','tomas_dev','tok_nocturne','NOCT',324497,0.0000016008,10.3617,now()-interval '10 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_pablo_11','pablo_sol','tok_nocturne','NOCT',46273,0.0000016008,8.1660,now()-interval '14 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_max_03','max_alpha','tok_alpha','ALPHA',38000000,0.000025336799999999998,5,now()-interval '20 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_max_03','max_alpha','tok_alpha','ALPHA',385980,0.000025336799999999998,3.4355,now()-interval '98 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_sara_18','sara_gem','tok_alpha','ALPHA',319604,0.000025336799999999998,11.0765,now()-interval '151 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_diego_05','diego_wld','tok_alpha','ALPHA',348101,0.000025336799999999998,5.5625,now()-interval '84 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_elena_08','elena_nft','tok_alpha','ALPHA',93491,0.000025336799999999998,1.4937,now()-interval '341 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_max_03','max_alpha','tok_apex','APEX',15000000,0.0000043700000000000005,5,now()-interval '10 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_max_03','max_alpha','tok_apex','APEX',158201,0.0000043700000000000005,4.7462,now()-interval '212 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_nina_10','nina_degen','tok_apex','APEX',272018,0.0000043700000000000005,11.2137,now()-interval '222 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_leo_15','leo_pump','tok_apex','APEX',152843,0.0000043700000000000005,1.6401,now()-interval '80 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_dan_19','dan_orbit','tok_apex','APEX',54941,0.0000043700000000000005,10.2563,now()-interval '9 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_sofia_04','sofia.eth','tok_rosa','ROSA',22000000,0.0000088248,5,now()-interval '15 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_marco_17','marco_ape','tok_rosa','ROSA',322106,0.0000088248,6.3210,now()-interval '164 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_sara_18','sara_gem','tok_rosa','ROSA',166494,0.0000088248,11.7915,now()-interval '356 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_mia_06','mia_crypto','tok_rosa','ROSA',342957,0.0000088248,5.3371,now()-interval '172 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_diego_05','diego_wld','tok_rosa','ROSA',137856,0.0000088248,1.8063,now()-interval '181 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_diego_05','diego_wld','tok_fuego','FUEG',67000000,0.0000777108,5,now()-interval '26 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_mia_06','mia_crypto','tok_fuego','FUEG',292327,0.0000777108,4.5858,now()-interval '305 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_rafa_21','rafa_whale','tok_fuego','FUEG',104293,0.0000777108,2.1727,now()-interval '246 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_sara_18','sara_gem','tok_fuego','FUEG',133928,0.0000777108,7.6107,now()-interval '460 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_anna_12','anna_hodl','tok_fuego','FUEG',265131,0.0000777108,4.2906,now()-interval '479 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_diego_05','diego_wld','tok_hielo','ICE',5000000,9.3e-7,5,now()-interval '4 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_max_03','max_alpha','tok_hielo','ICE',295476,9.3e-7,11.2743,now()-interval '84 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_jake_09','jake_diamond','tok_hielo','ICE',374400,9.3e-7,5.8142,now()-interval '0 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_val_16','val_builder','tok_hielo','ICE',164859,9.3e-7,2.4443,now()-interval '20 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_diego_05','diego_wld','tok_hielo','ICE',406486,9.3e-7,2.3298,now()-interval '37 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_mia_06','mia_crypto','tok_pixel','PIXL',33000000,0.0000192308,5,now()-interval '17 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_carlos_07','carlos_moon','tok_pixel','PIXL',23694,0.0000192308,6.4323,now()-interval '251 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_sofia_04','sofia.eth','tok_pixel','PIXL',172118,0.0000192308,7.2155,now()-interval '404 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_tomas_13','tomas_dev','tok_pixel','PIXL',108361,0.0000192308,4.7156,now()-interval '379 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_sara_18','sara_gem','tok_pixel','PIXL',250124,0.0000192308,7.1918,now()-interval '4 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_mia_06','mia_crypto','tok_vibe','VIBE',21000000,0.000008085199999999998,5,now()-interval '11 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_pgonia_01','pgonia','tok_vibe','VIBE',57342,0.000008085199999999998,11.7056,now()-interval '38 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_anna_12','anna_hodl','tok_vibe','VIBE',320345,0.000008085199999999998,6.2555,now()-interval '137 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_marco_17','marco_ape','tok_vibe','VIBE',136684,0.000008085199999999998,8.7700,now()-interval '145 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_diego_05','diego_wld','tok_vibe','VIBE',362940,0.000008085199999999998,6.2442,now()-interval '242 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_carlos_07','carlos_moon','tok_luna','LNAO',42000000,0.0000308408,5,now()-interval '19 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_pablo_11','pablo_sol','tok_luna','LNAO',385696,0.0000308408,4.5821,now()-interval '87 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_tomas_13','tomas_dev','tok_luna','LNAO',116168,0.0000308408,12.1531,now()-interval '168 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_lucia_20','lucia_bag','tok_luna','LNAO',119783,0.0000308408,4.9560,now()-interval '337 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_iris_14','iris_world','tok_luna','LNAO',277210,0.0000308408,5.0457,now()-interval '370 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_carlos_07','carlos_moon','tok_crater','CRTR',1500000,5.387e-7,5,now()-interval '2 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_tomas_13','tomas_dev','tok_crater','CRTR',307878,5.387e-7,10.5852,now()-interval '3 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_val_16','val_builder','tok_crater','CRTR',397845,5.387e-7,10.3653,now()-interval '32 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_iris_14','iris_world','tok_crater','CRTR',281966,5.387e-7,9.0967,now()-interval '10 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_pgonia_01','pgonia','tok_crater','CRTR',115113,5.387e-7,12.3671,now()-interval '2 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_elena_08','elena_nft','tok_nftape','ANFT',48000000,0.000040128799999999994,5,now()-interval '23 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_iris_14','iris_world','tok_nftape','ANFT',127565,0.000040128799999999994,12.4025,now()-interval '10 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_luna_02','luna_trader','tok_nftape','ANFT',84797,0.000040128799999999994,9.1974,now()-interval '529 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_tomas_13','tomas_dev','tok_nftape','ANFT',82139,0.000040128799999999994,4.7413,now()-interval '15 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_pgonia_01','pgonia','tok_nftape','ANFT',280821,0.000040128799999999994,6.7348,now()-interval '72 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_elena_08','elena_nft','tok_canvas','CNVS',18000000,0.0000060728,5,now()-interval '12 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_iris_14','iris_world','tok_canvas','CNVS',115918,0.0000060728,6.7980,now()-interval '105 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_dan_19','dan_orbit','tok_canvas','CNVS',41255,0.0000060728,2.0181,now()-interval '44 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_marco_17','marco_ape','tok_canvas','CNVS',93869,0.0000060728,10.9596,now()-interval '259 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_pgonia_01','pgonia','tok_canvas','CNVS',215829,0.0000060728,10.5127,now()-interval '215 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_jake_09','jake_diamond','tok_yolo','YOLO',52000000,0.000047008799999999996,5,now()-interval '24 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_mia_06','mia_crypto','tok_yolo','YOLO',140092,0.000047008799999999996,9.5494,now()-interval '144 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_dan_19','dan_orbit','tok_yolo','YOLO',136765,0.000047008799999999996,2.6470,now()-interval '322 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_pablo_11','pablo_sol','tok_yolo','YOLO',162121,0.000047008799999999996,7.0150,now()-interval '571 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_lucia_20','lucia_bag','tok_yolo','YOLO',83303,0.000047008799999999996,6.9806,now()-interval '457 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_nina_10','nina_degen','tok_zen','ZEN',26000000,0.0000121272,5,now()-interval '13 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_carlos_07','carlos_moon','tok_zen','ZEN',116869,0.0000121272,7.6178,now()-interval '138 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_carlos_07','carlos_moon','tok_zen','ZEN',342001,0.0000121272,1.9296,now()-interval '291 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_val_16','val_builder','tok_zen','ZEN',23353,0.0000121272,3.0643,now()-interval '194 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_sofia_04','sofia.eth','tok_zen','ZEN',43235,0.0000121272,4.7039,now()-interval '249 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_nina_10','nina_degen','tok_chaos','CHAOS',40000000,0.00002802,5,now()-interval '16 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_pablo_11','pablo_sol','tok_chaos','CHAOS',388407,0.00002802,2.4204,now()-interval '89 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_val_16','val_builder','tok_chaos','CHAOS',342628,0.00002802,3.3206,now()-interval '304 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_diego_05','diego_wld','tok_chaos','CHAOS',105003,0.00002802,8.5015,now()-interval '48 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_sara_18','sara_gem','tok_chaos','CHAOS',166925,0.00002802,2.9216,now()-interval '20 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_pablo_11','pablo_sol','tok_mate','MATE',19000000,0.0000067092,5,now()-interval '9 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_rafa_21','rafa_whale','tok_mate','MATE',330729,0.0000067092,0.6820,now()-interval '48 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_dan_19','dan_orbit','tok_mate','MATE',194415,0.0000067092,11.4858,now()-interval '60 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_carlos_07','carlos_moon','tok_mate','MATE',210298,0.0000067092,10.9909,now()-interval '150 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_max_03','max_alpha','tok_mate','MATE',281336,0.0000067092,10.2516,now()-interval '68 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_pablo_11','pablo_sol','tok_fomo','FOMO',57000000,0.0000563828,5,now()-interval '20 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_sara_18','sara_gem','tok_fomo','FOMO',234702,0.0000563828,12.0353,now()-interval '254 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_marco_17','marco_ape','tok_fomo','FOMO',310064,0.0000563828,2.2031,now()-interval '316 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_elena_08','elena_nft','tok_fomo','FOMO',270252,0.0000563828,4.7103,now()-interval '228 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_pablo_11','pablo_sol','tok_fomo','FOMO',297968,0.0000563828,1.2118,now()-interval '438 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_anna_12','anna_hodl','tok_hodl','HODL',58000000,0.00005836079999999999,5,now()-interval '22 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_tomas_13','tomas_dev','tok_hodl','HODL',139207,0.00005836079999999999,0.8428,now()-interval '169 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_carlos_07','carlos_moon','tok_hodl','HODL',273565,0.00005836079999999999,10.6823,now()-interval '372 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_nina_10','nina_degen','tok_hodl','HODL',380225,0.00005836079999999999,3.6058,now()-interval '161 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_luna_02','luna_trader','tok_hodl','HODL',277324,0.00005836079999999999,1.5538,now()-interval '312 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_tomas_13','tomas_dev','tok_devtool','DEVT',7000000,0.0000013428,5,now()-interval '6 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_marco_17','marco_ape','tok_devtool','DEVT',52286,0.0000013428,9.3509,now()-interval '128 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_mia_06','mia_crypto','tok_devtool','DEVT',267176,0.0000013428,2.7515,now()-interval '81 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_val_16','val_builder','tok_devtool','DEVT',347772,0.0000013428,4.0524,now()-interval '114 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_pgonia_01','pgonia','tok_devtool','DEVT',105951,0.0000013428,3.1379,now()-interval '64 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_tomas_13','tomas_dev','tok_debug','DBUG',2000000,5.688e-7,5,now()-interval '3 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_anna_12','anna_hodl','tok_debug','DBUG',317169,5.688e-7,7.2938,now()-interval '19 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_nina_10','nina_degen','tok_debug','DBUG',133195,5.688e-7,5.1048,now()-interval '22 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_carlos_07','carlos_moon','tok_debug','DBUG',43916,5.688e-7,8.4052,now()-interval '41 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_nina_10','nina_degen','tok_debug','DBUG',327688,5.688e-7,11.4758,now()-interval '4 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_iris_14','iris_world','tok_globe','GLBE',35000000,0.00002157,5,now()-interval '18 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_pablo_11','pablo_sol','tok_globe','GLBE',258561,0.00002157,11.8916,now()-interval '285 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_luna_02','luna_trader','tok_globe','GLBE',74755,0.00002157,4.4324,now()-interval '152 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_nina_10','nina_degen','tok_globe','GLBE',201669,0.00002157,4.8376,now()-interval '208 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_sofia_04','sofia.eth','tok_globe','GLBE',215651,0.00002157,5.5656,now()-interval '407 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_leo_15','leo_pump','tok_rocket','RKTF',64000000,0.00007095119999999999,5,now()-interval '27 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_marco_17','marco_ape','tok_rocket','RKTF',331744,0.00007095119999999999,4.2884,now()-interval '132 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_iris_14','iris_world','tok_rocket','RKTF',205361,0.00007095119999999999,4.7454,now()-interval '574 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_iris_14','iris_world','tok_rocket','RKTF',293333,0.00007095119999999999,9.2434,now()-interval '92 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_sofia_04','sofia.eth','tok_rocket','RKTF',290065,0.00007095119999999999,5.6889,now()-interval '452 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_leo_15','leo_pump','tok_pump','PUMP',31000000,0.0000170292,5,now()-interval '15 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_anna_12','anna_hodl','tok_pump','PUMP',273175,0.0000170292,9.0307,now()-interval '72 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_dan_19','dan_orbit','tok_pump','PUMP',247552,0.0000170292,8.0848,now()-interval '250 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_diego_05','diego_wld','tok_pump','PUMP',187468,0.0000170292,5.6130,now()-interval '87 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_pablo_11','pablo_sol','tok_pump','PUMP',61103,0.0000170292,9.1441,now()-interval '94 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_val_16','val_builder','tok_brick','BRCK',14000000,0.0000038712,5,now()-interval '8 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_lucia_20','lucia_bag','tok_brick','BRCK',253841,0.0000038712,7.7735,now()-interval '88 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_pgonia_01','pgonia','tok_brick','BRCK',145018,0.0000038712,10.3028,now()-interval '71 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_jake_09','jake_diamond','tok_brick','BRCK',175474,0.0000038712,8.4933,now()-interval '126 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_dan_19','dan_orbit','tok_brick','BRCK',407834,0.0000038712,6.2754,now()-interval '117 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_marco_17','marco_ape','tok_banana','BNNA',43000000,0.0000323028,5,now()-interval '19 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_pgonia_01','pgonia','tok_banana','BNNA',172987,0.0000323028,1.0431,now()-interval '214 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_max_03','max_alpha','tok_banana','BNNA',343807,0.0000323028,6.3377,now()-interval '119 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_mia_06','mia_crypto','tok_banana','BNNA',254771,0.0000323028,3.5972,now()-interval '317 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_elena_08','elena_nft','tok_banana','BNNA',83353,0.0000323028,6.8503,now()-interval '293 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_marco_17','marco_ape','tok_jungle','JNGL',9000000,0.0000018932,5,now()-interval '5 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_sara_18','sara_gem','tok_jungle','JNGL',352312,0.0000018932,2.7012,now()-interval '10 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_max_03','max_alpha','tok_jungle','JNGL',138733,0.0000018932,7.1634,now()-interval '99 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_nina_10','nina_degen','tok_jungle','JNGL',309031,0.0000018932,1.6500,now()-interval '21 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_carlos_07','carlos_moon','tok_jungle','JNGL',406506,0.0000018932,3.6308,now()-interval '97 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_sara_18','sara_gem','tok_gem','HGEM',11000000,0.0000025812,5,now()-interval '7 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_sofia_04','sofia.eth','tok_gem','HGEM',25720,0.0000025812,10.8064,now()-interval '55 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_dan_19','dan_orbit','tok_gem','HGEM',155834,0.0000025812,11.1462,now()-interval '71 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_nina_10','nina_degen','tok_gem','HGEM',399713,0.0000025812,8.7617,now()-interval '85 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_val_16','val_builder','tok_gem','HGEM',131673,0.0000025812,7.4460,now()-interval '50 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_dan_19','dan_orbit','tok_orbit2','ORBT',37000000,0.000024046799999999998,5,now()-interval '16 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_luna_02','luna_trader','tok_orbit2','ORBT',169657,0.000024046799999999998,7.8084,now()-interval '21 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_mia_06','mia_crypto','tok_orbit2','ORBT',73995,0.000024046799999999998,10.3593,now()-interval '260 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_marco_17','marco_ape','tok_orbit2','ORBT',177090,0.000024046799999999998,2.1060,now()-interval '295 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_luna_02','luna_trader','tok_orbit2','ORBT',232276,0.000024046799999999998,7.7408,now()-interval '147 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_lucia_20','lucia_bag','tok_bag','BAGS',50000000,0.0000435,5,now()-interval '21 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_mia_06','mia_crypto','tok_bag','BAGS',181738,0.0000435,8.0090,now()-interval '361 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_elena_08','elena_nft','tok_bag','BAGS',73430,0.0000435,8.2573,now()-interval '319 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_dan_19','dan_orbit','tok_bag','BAGS',403399,0.0000435,10.7689,now()-interval '147 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_leo_15','leo_pump','tok_bag','BAGS',244623,0.0000435,6.8992,now()-interval '111 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_lucia_20','lucia_bag','tok_stack','STAK',4000000,7.752e-7,5,now()-interval '4 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_leo_15','leo_pump','tok_stack','STAK',118746,7.752e-7,5.5303,now()-interval '23 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_pgonia_01','pgonia','tok_stack','STAK',355224,7.752e-7,7.1447,now()-interval '31 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_leo_15','leo_pump','tok_stack','STAK',26308,7.752e-7,4.5506,now()-interval '62 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_jake_09','jake_diamond','tok_stack','STAK',21984,7.752e-7,11.8230,now()-interval '45 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_rafa_21','rafa_whale','tok_whale','WHAL',69000000,0.0000823892,5,now()-interval '28 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_leo_15','leo_pump','tok_whale','WHAL',318855,0.0000823892,5.5474,now()-interval '513 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_pgonia_01','pgonia','tok_whale','WHAL',386006,0.0000823892,4.1201,now()-interval '612 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_dan_19','dan_orbit','tok_whale','WHAL',262254,0.0000823892,11.8328,now()-interval '227 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_max_03','max_alpha','tok_whale','WHAL',311975,0.0000823892,2.5553,now()-interval '659 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('create','usr_rafa_21','rafa_whale','tok_shrimp','SHRP',16000000,0.0000049032,5,now()-interval '10 days');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_sara_18','sara_gem','tok_shrimp','SHRP',77719,0.0000049032,12.2806,now()-interval '36 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_rafa_21','rafa_whale','tok_shrimp','SHRP',291558,0.0000049032,5.0568,now()-interval '13 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('sell','usr_lucia_20','lucia_bag','tok_shrimp','SHRP',288919,0.0000049032,11.6504,now()-interval '155 hours');
INSERT INTO token_activity (type,user_id,username,token_id,token_symbol,amount,price,total,timestamp)
  VALUES ('buy','usr_pablo_11','pablo_sol','tok_shrimp','SHRP',30192,0.0000049032,4.0835,now()-interval '191 hours');

-- ─────────────────────────────────────────────
-- 5. PRICE SNAPSHOTS (max 8 per token)
-- ─────────────────────────────────────────────
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_wpepe',5.13932e-7,0.000001541796,900000,16.54,'trade',now()-interval '504 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_wpepe',0.000001391647752320017,0.000004174943256960051,7199999,48.70,'trade',now()-interval '432 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_wpepe',0.0000036347,0.0000109041,13500000,23.65,'trade',now()-interval '360 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_wpepe',0.000007243088,0.000021729264,19800000,32.53,'trade',now()-interval '288 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_wpepe',0.000012216811999999999,0.000036650435999999996,26100000,21.03,'trade',now()-interval '216 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_wpepe',0.000018555872,0.000055667616,32400000,32.47,'trade',now()-interval '144 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_wpepe',0.000026260268,0.000078780804,38700000,36.78,'trade',now()-interval '72 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_wpepe',0.000035329999999999995,0.00010598999999999998,45000000,47.07,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_mdust',5.0099072e-7,0.0000015029721599999999,240000,4.37,'trade',now()-interval '336 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_mdust',5.634060139520172e-7,0.0000016902180418560514,1919999,3.58,'trade',now()-interval '288 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_mdust',7.22912e-7,0.0000021687360000000002,3600000,0.42,'trade',now()-interval '240 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_mdust',9.7950848e-7,0.00000293852544,5280000,0.17,'trade',now()-interval '192 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_mdust',0.0000013331952805760172,0.0000039995858417280515,6959999,0.17,'trade',now()-interval '144 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_mdust',0.00000178397312,0.00000535191936,8640000,2.94,'trade',now()-interval '96 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_mdust',0.0000023318412799999997,0.0000069955238399999994,10320000,1.50,'trade',now()-interval '48 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_mdust',0.0000029767999999999996,0.000008930399999999998,12000000,6.64,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_orbcoin',5.2644672e-7,0.00000157934016,1240000,112.69,'trade',now()-interval '600 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_orbcoin',0.000002192589738752017,0.0000065777692162560505,9919999,61.98,'trade',now()-interval '514 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_orbcoin',0.000006450512,0.000019351535999999998,18600000,68.18,'trade',now()-interval '428 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_orbcoin',0.00001330021248,0.00003990063744,27280000,18.29,'trade',now()-interval '342 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_orbcoin',0.00002274169152,0.00006822507456,35960000,56.93,'trade',now()-interval '257 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_orbcoin',0.00003477494912,0.00010432484736,44640000,143.47,'trade',now()-interval '171 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_orbcoin',0.000049399985279999995,0.00014819995583999999,53320000,94.79,'trade',now()-interval '85 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_orbcoin',0.0000666168,0.0001998504,62000000,13.56,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hyperh',5.0008428e-7,0.00000150025284,70000,0.90,'trade',now()-interval '72 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hyperh',5.053939007360172e-7,0.0000015161817022080515,559999,0.68,'trade',now()-interval '61 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hyperh',5.18963e-7,0.0000015568889999999998,1050000,2.03,'trade',now()-interval '51 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hyperh',5.4079152e-7,0.00000162237456,1540000,1.43,'trade',now()-interval '41 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hyperh',5.708794101680172e-7,0.0000017126382305040516,2029999,2.15,'trade',now()-interval '30 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hyperh',6.0922688e-7,0.00000182768064,2520000,0.74,'trade',now()-interval '20 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hyperh',6.5583372e-7,0.0000019675011599999998,3010000,0.58,'trade',now()-interval '10 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hyperh',7.107e-7,0.0000021321000000000003,3500000,1.77,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_dhand',5.053939199999999e-7,0.0000015161817599999999,560000,16.92,'trade',now()-interval '432 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_dhand',8.452107258880171e-7,0.000002535632177664051,4479999,3.18,'trade',now()-interval '370 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_dhand',0.000001713632,0.000005140896,8400000,19.98,'trade',now()-interval '308 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_dhand',0.0000031106572799999998,0.00000933197184,12320000,12.88,'trade',now()-interval '246 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_dhand',0.000005036286161344017,0.00001510885848403205,16239999,18.72,'trade',now()-interval '185 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_dhand',0.0000074905203200000006,0.00002247156096,20160000,29.03,'trade',now()-interval '123 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_dhand',0.000010473358079999999,0.00003142007424,24080000,23.74,'trade',now()-interval '61 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_dhand',0.0000139848,0.0000419544,28000000,26.19,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_solara',5.20812e-7,0.0000015624359999999998,1100000,59.13,'trade',now()-interval '528 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_solara',0.0000018319676972800173,0.000005495903091840051,8799999,13.50,'trade',now()-interval '452 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_solara',0.0000051827,0.0000155481,16500000,19.63,'trade',now()-interval '377 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_solara',0.000010573008,0.000031719024,24200000,37.38,'trade',now()-interval '301 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_solara',0.000018002890902640016,0.00005400867270792005,31899999,6.20,'trade',now()-interval '226 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_solara',0.000027472351999999997,0.00008241705599999999,39600000,29.77,'trade',now()-interval '150 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_solara',0.00003898138799999999,0.00011694416399999998,47300000,92.54,'trade',now()-interval '75 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_solara',0.00005253,0.00015759,55000000,90.77,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_nocturne',5.004403199999999e-7,0.0000015013209599999997,160000,4.01,'trade',now()-interval '168 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_nocturne',5.281804359680171e-7,0.0000015845413079040514,1279999,4.01,'trade',now()-interval '144 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_nocturne',5.99072e-7,0.000001797216,2400000,2.98,'trade',now()-interval '120 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_nocturne',7.1311488e-7,0.00000213934464,3520000,3.90,'trade',now()-interval '96 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_nocturne',8.7030912e-7,0.00000261092736,4640000,2.36,'trade',now()-interval '72 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_nocturne',0.0000010706547199999998,0.0000032119641599999995,5760000,1.20,'trade',now()-interval '48 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_nocturne',0.00000131415168,0.0000039424550399999995,6880000,2.54,'trade',now()-interval '24 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_nocturne',0.0000016008,0.0000048024,8000000,2.16,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_alpha',5.099347199999999e-7,0.0000015298041599999998,760000,29.95,'trade',now()-interval '480 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_alpha',0.0000011358218708480171,0.000003407465612544051,6079999,59.82,'trade',now()-interval '411 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_alpha',0.000002735312,0.000008205935999999999,11400000,57.94,'trade',now()-interval '342 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_alpha',0.000005308404480000001,0.000015925213440000003,16720000,59.43,'trade',now()-interval '274 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_alpha',0.00000885509952,0.00002656529856,22040000,13.74,'trade',now()-interval '205 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_alpha',0.000013375397119999999,0.00004012619136,27360000,41.94,'trade',now()-interval '137 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_alpha',0.00001886929728,0.00005660789184,32680000,1.27,'trade',now()-interval '68 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_alpha',0.000025336799999999998,0.0000760104,38000000,60.47,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_apex',5.015479999999999e-7,0.000001504644,300000,0.12,'trade',now()-interval '240 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_apex',5.990719174400172e-7,0.0000017972157523200517,2399999,3.10,'trade',now()-interval '205 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_apex',8.483e-7,0.0000025449,4500000,7.65,'trade',now()-interval '171 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_apex',0.0000012492319999999999,0.0000037476959999999996,6600000,4.49,'trade',now()-interval '137 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_apex',0.000001801868,0.0000054056040000000005,8700000,8.52,'trade',now()-interval '102 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_apex',0.0000025062079999999996,0.0000075186239999999984,10800000,1.68,'trade',now()-interval '68 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_apex',0.0000033622519999999995,0.000010086756,12900000,6.67,'trade',now()-interval '34 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_apex',0.0000043700000000000005,0.000013110000000000002,15000000,11.68,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_rosa',5.0332992e-7,0.00000150998976,440000,3.80,'trade',now()-interval '360 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_rosa',7.131147589120172e-7,0.0000021393442767360514,3519999,5.01,'trade',now()-interval '308 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_rosa',0.0000012492319999999999,0.0000037476959999999996,6600000,8.00,'trade',now()-interval '257 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_rosa',0.00000211168128,0.000006335043839999999,9680000,6.81,'trade',now()-interval '205 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_rosa',0.00000330046272,0.00000990138816,12760000,1.40,'trade',now()-interval '154 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_rosa',0.00000481557632,0.000014446728959999998,15840000,6.94,'trade',now()-interval '102 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_rosa',0.00000665702208,0.00001997106624,18920000,2.96,'trade',now()-interval '51 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_rosa',0.0000088248,0.000026474400000000002,22000000,2.89,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_fuego',5.3088432e-7,0.0000015926529599999998,1340000,168.37,'trade',now()-interval '624 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_fuego',0.000002476596111232017,0.0000074297883336960505,10719999,148.76,'trade',now()-interval '534 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_fuego',0.000007448971999999999,0.000022346915999999998,20100000,171.12,'trade',now()-interval '445 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_fuego',0.000015448010879999997,0.00004634403263999999,29480000,40.44,'trade',now()-interval '356 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_fuego',0.000026473713119999997,0.00007942113935999999,38860000,165.61,'trade',now()-interval '267 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_fuego',0.00004052607872,0.00012157823616,48240000,11.82,'trade',now()-interval '178 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_fuego',0.000057605107679999996,0.00017281532304,57620000,80.13,'trade',now()-interval '89 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_fuego',0.0000777108,0.00023313240000000002,67000000,52.81,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hielo',5.00172e-7,0.0000015005159999999999,100000,1.08,'trade',now()-interval '96 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hielo',5.110079724800171e-7,0.0000015330239174400514,799999,1.49,'trade',now()-interval '82 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hielo',5.387e-7,0.0000016161,1500000,0.25,'trade',now()-interval '68 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hielo',5.83248e-7,0.0000017497440000000001,2200000,0.62,'trade',now()-interval '54 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hielo',6.44652e-7,0.000001933956,2900000,0.15,'trade',now()-interval '41 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hielo',7.22912e-7,0.0000021687360000000002,3600000,0.33,'trade',now()-interval '27 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hielo',8.18028e-7,0.000002454084,4300000,0.35,'trade',now()-interval '13 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hielo',9.3e-7,0.00000279,5000000,1.08,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_pixel',5.0749232e-7,0.00000152247696,660000,9.44,'trade',now()-interval '408 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_pixel',9.795082983680171e-7,0.0000029385248951040513,5279999,15.74,'trade',now()-interval '349 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_pixel',0.000002185772,0.0000065573159999999995,9900000,34.22,'trade',now()-interval '291 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_pixel',0.00000412628288,0.000012378848640000001,14520000,20.88,'trade',now()-interval '233 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_pixel',0.00000680104112,0.000020403123359999998,19140000,1.65,'trade',now()-interval '174 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_pixel',0.000010210046719999999,0.00003063014016,23760000,0.18,'trade',now()-interval '116 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_pixel',0.00001435329968,0.00004305989904,28380000,19.94,'trade',now()-interval '58 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_pixel',0.0000192308,0.0000576924,33000000,21.50,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_vibe',5.0303408e-7,0.0000015091022399999997,420000,6.27,'trade',now()-interval '264 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_vibe',6.941810044160171e-7,0.0000020825430132480515,3359999,2.42,'trade',now()-interval '226 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_vibe',0.0000011826679999999999,0.000003548004,6300000,0.93,'trade',now()-interval '188 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_vibe',0.0000019684947199999998,0.00000590548416,9240000,7.64,'trade',now()-interval '150 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_vibe',0.0000030516612799999997,0.000009154983839999999,12180000,7.99,'trade',now()-interval '113 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_vibe',0.00000443216768,0.000013296503040000001,15120000,2.30,'trade',now()-interval '75 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_vibe',0.0000061100139200000005,0.00001833004176,18060000,8.76,'trade',now()-interval '37 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_vibe',0.000008085199999999998,0.000024255599999999995,21000000,9.34,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_luna',5.1213632e-7,0.00000153640896,840000,7.02,'trade',now()-interval '456 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_luna',0.000001276724248832017,0.0000038301727464960515,6719999,0.30,'trade',now()-interval '390 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_luna',0.0000032306719999999995,0.000009692015999999998,12600000,1.40,'trade',now()-interval '325 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_luna',0.00000637397888,0.000019121936639999998,18480000,15.04,'trade',now()-interval '260 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_luna',0.00001070664512,0.00003211993536,24360000,11.66,'trade',now()-interval '195 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_luna',0.000016228670719999998,0.00004868601215999999,30240000,13.46,'trade',now()-interval '130 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_luna',0.00002294005568,0.00006882016704,36120000,15.61,'trade',now()-interval '65 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_luna',0.0000308408,0.0000925224,42000000,13.57,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_crater',5.0001548e-7,0.00000150004644,30000,0.53,'trade',now()-interval '48 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_crater',5.009907117440171e-7,0.0000015029721352320515,239999,0.70,'trade',now()-interval '41 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_crater',5.03483e-7,0.0000015104489999999998,450000,0.02,'trade',now()-interval '34 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_crater',5.0749232e-7,0.00000152247696,660000,0.33,'trade',now()-interval '27 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_crater',5.130186500720172e-7,0.0000015390559502160515,869999,0.72,'trade',now()-interval '20 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_crater',5.2006208e-7,0.00000156018624,1080000,0.42,'trade',now()-interval '13 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_crater',5.2862252e-7,0.00000158586756,1290000,0.08,'trade',now()-interval '6 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_crater',5.387e-7,0.0000016161,1500000,0.44,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_nftape',5.1585152e-7,0.0000015475545600000001,960000,43.57,'trade',now()-interval '552 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_nftape',0.0000015144970158080173,0.000004543491047424052,7679999,36.83,'trade',now()-interval '473 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_nftape',0.000004066592,0.000012199775999999999,14400000,23.39,'trade',now()-interval '394 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_nftape',0.00000817213568,0.00002451640704,21120000,70.33,'trade',now()-interval '315 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_nftape',0.000013831127362304017,0.000041493382086912054,27839999,47.45,'trade',now()-interval '236 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_nftape',0.00002104356992,0.00006313070976,34560000,24.14,'trade',now()-interval '157 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_nftape',0.000029809460479999995,0.00008942838143999999,41280000,42.49,'trade',now()-interval '78 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_nftape',0.000040128799999999994,0.00012038639999999998,48000000,40.14,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_canvas',5.0222912e-7,0.00000150668736,360000,5.90,'trade',now()-interval '288 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_canvas',6.426635809280172e-7,0.0000019279907427840515,2879999,1.78,'trade',now()-interval '246 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_canvas',0.0000010015519999999998,0.0000030046559999999994,5400000,2.15,'trade',now()-interval '205 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_canvas',0.00000157889408,0.00000473668224,7920000,5.07,'trade',now()-interval '164 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_canvas',0.0000023746899199999998,0.000007124069759999999,10440000,9.10,'trade',now()-interval '123 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_canvas',0.00000338893952,0.00001016681856,12960000,0.05,'trade',now()-interval '82 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_canvas',0.00000462164288,0.000013864928639999999,15480000,9.59,'trade',now()-interval '41 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_canvas',0.0000060728,0.000018218399999999998,18000000,3.34,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_yolo',5.1860352e-7,0.0000015558105599999998,1040000,33.99,'trade',now()-interval '576 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_yolo',0.0000016906249937920172,0.0000050718749813760516,8319999,56.94,'trade',now()-interval '493 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_yolo',0.000004685792000000001,0.000014057376000000003,15600000,57.99,'trade',now()-interval '411 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_yolo',0.000009504103679999999,0.000028512311039999997,22880000,51.00,'trade',now()-interval '329 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_yolo',0.000016145559282496016,0.00004843667784748805,30159999,64.22,'trade',now()-interval '246 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_yolo',0.000024610161919999998,0.00007383048575999999,37440000,63.92,'trade',now()-interval '164 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_yolo',0.00003489790848,0.00010469372543999999,44720000,41.18,'trade',now()-interval '82 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_yolo',0.000047008799999999996,0.0001410264,52000000,55.21,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_zen',5.0465088e-7,0.00000151395264,520000,0.09,'trade',now()-interval '312 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_zen',7.976561768960171e-7,0.0000023929685306880514,4159999,5.16,'trade',now()-interval '267 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_zen',0.0000015464480000000002,0.000004639344,7800000,2.24,'trade',now()-interval '222 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_zen',0.0000027510259199999996,0.000008253077759999998,11440000,5.29,'trade',now()-interval '178 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_zen',0.0000044113895612480176,0.000013234168683744052,15079999,4.88,'trade',now()-interval '133 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_zen',0.00000652754048,0.00001958262144,18720000,5.87,'trade',now()-interval '89 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_zen',0.00000909947712,0.00002729843136,22360000,6.31,'trade',now()-interval '44 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_zen',0.0000121272,0.0000363816,26000000,4.32,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_chaos',5.11008e-7,0.0000015330239999999998,800000,2.56,'trade',now()-interval '384 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_chaos',0.000001204511779840017,0.0000036135353395200513,6399999,5.24,'trade',now()-interval '329 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_chaos',0.0000029767999999999996,0.000008930399999999998,12000000,13.22,'trade',now()-interval '274 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_chaos',0.000005827872000000001,0.000017483616,17600000,14.48,'trade',now()-interval '219 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_chaos',0.000009757728,0.000029273184,23200000,0.37,'trade',now()-interval '164 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_chaos',0.000014766368,0.000044299104,28800000,16.95,'trade',now()-interval '109 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_chaos',0.000020853791999999998,0.000062561376,34400000,0.54,'trade',now()-interval '54 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_chaos',0.00002802,0.00008406,40000000,5.62,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_mate',5.024836799999999e-7,0.0000015074510399999998,380000,5.54,'trade',now()-interval '216 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_mate',6.589554154240172e-7,0.0000019768662462720516,3039999,5.36,'trade',now()-interval '185 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_mate',0.0000010588279999999999,0.0000031764839999999996,5700000,5.80,'trade',now()-interval '154 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_mate',0.00000170210112,0.00000510630336,8360000,4.59,'trade',now()-interval '123 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_mate',0.0000025887748799999996,0.000007766324639999998,11020000,9.62,'trade',now()-interval '92 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_mate',0.0000037188492799999995,0.000011156547839999998,13680000,8.77,'trade',now()-interval '61 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_mate',0.0000050923243200000005,0.000015276972960000003,16340000,5.17,'trade',now()-interval '30 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_mate',0.0000067092,0.0000201276,19000000,11.97,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_fomo',5.2235312e-7,0.0000015670593599999997,1140000,22.63,'trade',now()-interval '480 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_fomo',0.0000019305993662720172,0.000005791798098816052,9119999,112.56,'trade',now()-interval '411 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_fomo',0.000005529452,0.000016588355999999998,17100000,74.68,'trade',now()-interval '342 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_fomo',0.00001131891008,0.000033956730240000004,25080000,23.85,'trade',now()-interval '274 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_fomo',0.000019298972782736014,0.00005789691834820804,33059999,59.48,'trade',now()-interval '205 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_fomo',0.00002946964352,0.00008840893056,41040000,18.69,'trade',now()-interval '137 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_fomo',0.00004183091888,0.00012549275664,49020000,35.95,'trade',now()-interval '68 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_fomo',0.0000563828,0.0001691484,57000000,106.03,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hodl',5.2314432e-7,0.0000015694329599999999,1160000,14.22,'trade',now()-interval '528 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hodl',0.000001981236160768017,0.000005943708482304051,9279999,76.06,'trade',now()-interval '452 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hodl',0.000005707472,0.000017122416,17400000,8.54,'trade',now()-interval '377 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hodl',0.00001170185088,0.00003510555264,25520000,10.52,'trade',now()-interval '301 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hodl',0.000019964373119999995,0.00005989311935999998,33640000,30.49,'trade',now()-interval '226 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hodl',0.000030495038719999997,0.00009148511615999999,41760000,44.25,'trade',now()-interval '150 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hodl',0.00004329384768,0.00012988154304,49880000,47.15,'trade',now()-interval '75 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_hodl',0.00005836079999999999,0.0001750824,58000000,21.32,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_devtool',5.0033712e-7,0.0000015010113599999998,140000,2.25,'trade',now()-interval '144 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_devtool',5.215756414720172e-7,0.0000015647269244160516,1119999,2.38,'trade',now()-interval '123 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_devtool',5.75852e-7,0.000001727556,2100000,1.71,'trade',now()-interval '102 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_devtool',6.631660799999999e-7,0.0000019894982399999997,3080000,2.71,'trade',now()-interval '82 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_devtool',7.835177803360172e-7,0.000002350553341008052,4059999,0.18,'trade',now()-interval '61 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_devtool',9.3690752e-7,0.00000281072256,5040000,0.22,'trade',now()-interval '41 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_devtool',0.0000011233348799999998,0.0000033700046399999994,6020000,2.07,'trade',now()-interval '20 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_devtool',0.0000013428,0.0000040284,7000000,1.32,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_debug',5.0002752e-7,0.0000015000825599999999,40000,0.67,'trade',now()-interval '72 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_debug',5.017612689920171e-7,0.0000015052838069760514,319999,0.84,'trade',now()-interval '61 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_debug',5.06192e-7,0.000001518576,600000,0.66,'trade',now()-interval '51 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_debug',5.133196799999999e-7,0.0000015399590399999997,880000,0.97,'trade',now()-interval '41 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_debug',5.2314432e-7,0.0000015694329599999999,1160000,0.67,'trade',now()-interval '30 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_debug',5.3566592e-7,0.00000160699776,1440000,0.95,'trade',now()-interval '20 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_debug',5.5088448e-7,0.00000165265344,1720000,1.17,'trade',now()-interval '10 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_debug',5.688e-7,0.0000017063999999999999,2000000,0.52,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_globe',5.08428e-7,0.000001525284,700000,14.50,'trade',now()-interval '432 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_globe',0.0000010393918073600171,0.0000031181754220800514,5599999,21.14,'trade',now()-interval '370 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_globe',0.0000023963,0.0000071889,10500000,4.72,'trade',now()-interval '308 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_globe',0.000004579152,0.000013737455999999998,15400000,10.43,'trade',now()-interval '246 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_globe',0.000007587948,0.000022763844,20300000,0.91,'trade',now()-interval '185 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_globe',0.000011422687999999999,0.00003426806399999999,25200000,8.93,'trade',now()-interval '123 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_globe',0.000016083371999999996,0.00004825011599999999,30100000,14.70,'trade',now()-interval '61 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_globe',0.00002157,0.00006471,35000000,3.04,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_rocket',5.2818048e-7,0.00000158454144,1280000,43.06,'trade',now()-interval '648 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_rocket',0.000002303550367744017,0.000006910651103232051,10239999,101.52,'trade',now()-interval '555 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_rocket',0.0000068406079999999996,0.000020521824,19200000,114.63,'trade',now()-interval '462 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_rocket',0.00001413935232,0.00004241805696,28160000,154.31,'trade',now()-interval '370 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_rocket',0.000024199783679999997,0.00007259935104,37120000,36.11,'trade',now()-interval '277 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_rocket',0.000037021902079999996,0.00011106570623999999,46080000,45.93,'trade',now()-interval '185 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_rocket',0.000052605707519999994,0.00015781712255999997,55040000,185.77,'trade',now()-interval '92 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_rocket',0.00007095119999999999,0.00021285359999999998,64000000,120.53,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_pump',5.0661168e-7,0.0000015198350399999999,620000,50.76,'trade',now()-interval '360 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_pump',9.231473493760172e-7,0.0000027694420481280517,4959999,13.29,'trade',now()-interval '308 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_pump',0.0000019876279999999998,0.000005962884,9300000,27.94,'trade',now()-interval '257 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_pump',0.0000037000531199999997,0.00001110015936,13640000,17.46,'trade',now()-interval '205 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_pump',0.0000060604228800000004,0.000018181268640000003,17980000,13.57,'trade',now()-interval '154 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_pump',0.00000906873728,0.00002720621184,22320000,34.01,'trade',now()-interval '102 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_pump',0.00001272499632,0.00003817498896,26660000,30.90,'trade',now()-interval '51 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_pump',0.0000170292,0.000051087599999999995,31000000,26.34,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_brick',5.0134848e-7,0.00000150404544,280000,2.34,'trade',now()-interval '192 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_brick',5.863026429440172e-7,0.0000017589079288320517,2239999,4.65,'trade',now()-interval '164 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_brick',8.03408e-7,0.000002410224,4200000,5.45,'trade',now()-interval '137 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_brick',0.00000115266432,0.0000034579929599999996,6160000,2.29,'trade',now()-interval '109 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_brick',0.000001634071400672017,0.000004902214202016051,8119999,5.79,'trade',now()-interval '82 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_brick',0.00000224763008,0.0000067428902400000004,10080000,2.38,'trade',now()-interval '54 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_brick',0.0000029933395199999996,0.000008980018559999998,12040000,6.87,'trade',now()-interval '27 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_brick',0.0000038712,0.0000116136,14000000,2.56,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_banana',5.127211199999999e-7,0.0000015381633599999998,860000,11.38,'trade',now()-interval '456 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_banana',0.000001314151443328017,0.000003942454329984051,6879999,28.45,'trade',now()-interval '390 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_banana',0.0000033622519999999995,0.000010086756,12900000,16.40,'trade',now()-interval '325 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_banana',0.00000665702208,0.00001997106624,18920000,0.97,'trade',now()-interval '260 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_banana',0.00001119846192,0.00003359538576,24940000,62.95,'trade',now()-interval '195 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_banana',0.000016986571519999996,0.00005095971455999999,30960000,47.35,'trade',now()-interval '130 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_banana',0.000024021350879999995,0.00007206405263999999,36980000,47.60,'trade',now()-interval '65 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_banana',0.0000323028,0.00009690839999999999,43000000,0.06,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_jungle',5.0055728e-7,0.0000015016718399999999,180000,0.74,'trade',now()-interval '120 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_jungle',5.356658704640172e-7,0.0000016069976113920517,1439999,4.55,'trade',now()-interval '102 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_jungle',6.25388e-7,0.0000018761639999999998,2700000,5.01,'trade',now()-interval '85 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_jungle',7.6972352e-7,0.0000023091705599999998,3960000,1.10,'trade',now()-interval '68 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_jungle',9.686724799999998e-7,0.0000029060174399999995,5220000,2.81,'trade',now()-interval '51 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_jungle',0.00000122223488,0.00000366670464,6480000,4.62,'trade',now()-interval '34 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_jungle',0.0000015304107199999997,0.000004591232159999999,7740000,3.66,'trade',now()-interval '17 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_jungle',0.0000018932,0.0000056796,9000000,3.91,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_gem',5.0083248e-7,0.00000150249744,220000,5.97,'trade',now()-interval '168 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_gem',5.532786594560172e-7,0.0000016598359783680515,1759999,0.51,'trade',now()-interval '144 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_gem',6.87308e-7,0.000002061924,3300000,6.92,'trade',now()-interval '120 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_gem',9.029203199999999e-7,0.0000027087609599999996,4840000,4.66,'trade',now()-interval '96 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_gem',0.0000012001156799999999,0.0000036003470399999996,6380000,9.23,'trade',now()-interval '72 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_gem',0.00000157889408,0.00000473668224,7920000,6.62,'trade',now()-interval '48 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_gem',0.0000020392555199999997,0.000006117766559999999,9460000,0.61,'trade',now()-interval '24 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_gem',0.0000025812,0.0000077436,11000000,4.98,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_orbit2',5.0941872e-7,0.00000152825616,740000,2.48,'trade',now()-interval '384 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_orbit2',0.0000011027978763520171,0.0000033083936290560516,5919999,7.30,'trade',now()-interval '329 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_orbit2',0.0000026192119999999998,0.000007857636,11100000,3.30,'trade',now()-interval '274 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_orbit2',0.000005058660479999999,0.000015175981439999999,16280000,0.30,'trade',now()-interval '219 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_orbit2',0.00000842114352,0.00002526343056,21460000,10.91,'trade',now()-interval '164 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_orbit2',0.00001270666112,0.00003811998336,26640000,8.75,'trade',now()-interval '109 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_orbit2',0.000017915213279999998,0.000053745639839999995,31820000,11.80,'trade',now()-interval '54 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_orbit2',0.000024046799999999998,0.0000721404,37000000,8.98,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_bag',5.172e-7,0.0000015516,1000000,8.50,'trade',now()-interval '504 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_bag',0.0000016007997248000174,0.0000048023991744000525,7999999,62.57,'trade',now()-interval '432 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_bag',0.0000043700000000000005,0.000013110000000000002,15000000,60.53,'trade',now()-interval '360 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_bag',0.0000088248,0.000026474400000000002,22000000,70.88,'trade',now()-interval '288 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_bag',0.000014965199002400018,0.000044895597007200054,28999999,35.19,'trade',now()-interval '216 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_bag',0.000022791199999999996,0.00006837359999999999,36000000,32.51,'trade',now()-interval '144 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_bag',0.0000323028,0.00009690839999999999,43000000,28.09,'trade',now()-interval '72 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_bag',0.0000435,0.0001305,50000000,35.83,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_stack',5.0011008e-7,0.00000150033024,80000,0.37,'trade',now()-interval '96 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_stack',5.070450979840172e-7,0.0000015211352939520516,639999,0.37,'trade',now()-interval '82 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_stack',5.24768e-7,0.000001574304,1200000,0.68,'trade',now()-interval '68 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_stack',5.5327872e-7,0.0000016598361599999999,1760000,0.73,'trade',now()-interval '54 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_stack',5.9257728e-7,0.00000177773184,2320000,0.87,'trade',now()-interval '41 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_stack',6.4266368e-7,0.0000019279910399999997,2880000,0.06,'trade',now()-interval '27 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_stack',7.035379199999999e-7,0.0000021106137599999997,3440000,1.09,'trade',now()-interval '13 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_stack',7.752e-7,0.0000023256000000000002,4000000,1.03,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_whale',5.3275568e-7,0.0000015982670399999999,1380000,71.98,'trade',now()-interval '672 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_whale',0.000002596363140224017,0.00000778908942067205,11039999,133.28,'trade',now()-interval '576 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_whale',0.000007870027999999999,0.000023610083999999996,20700000,114.81,'trade',now()-interval '480 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_whale',0.000016353749119999998,0.00004906124735999999,30360000,269.81,'trade',now()-interval '384 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_whale',0.000028047526879999998,0.00008414258064,40020000,235.97,'trade',now()-interval '288 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_whale',0.00004295136128,0.00012885408384,49680000,12.32,'trade',now()-interval '192 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_whale',0.00006106525232,0.00018319575696,59340000,65.95,'trade',now()-interval '96 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_whale',0.0000823892,0.0002471676,69000000,187.54,'trade',now()-interval '0 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_shrimp',5.017612799999999e-7,0.0000015052838399999998,320000,2.75,'trade',now()-interval '240 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_shrimp',6.127218319360172e-7,0.0000018381654958080516,2559999,1.62,'trade',now()-interval '205 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_shrimp',8.962879999999999e-7,0.0000026888639999999996,4800000,6.55,'trade',now()-interval '171 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_shrimp',0.0000013524595199999999,0.00000405737856,7040000,3.30,'trade',now()-interval '137 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_shrimp',0.00000198123648,0.00000594370944,9280000,3.28,'trade',now()-interval '102 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_shrimp',0.0000027826188799999997,0.000008347856639999999,11520000,0.16,'trade',now()-interval '68 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_shrimp',0.0000037566067199999996,0.000011269820159999999,13760000,1.27,'trade',now()-interval '34 hours');
INSERT INTO price_snapshots (token_id,price_wld,price_usdc,supply,volume,type,created_at)
  VALUES ('tok_shrimp',0.0000049032,0.000014709599999999999,16000000,3.48,'trade',now()-interval '0 hours');

-- ─────────────────────────────────────────────
-- 6. AIRDROPS (6 active airdrops)
-- ─────────────────────────────────────────────
INSERT INTO airdrops (token_id,token_name,token_symbol,token_emoji,title,description,total_amount,claimed_amount,daily_amount,participants,max_participants,end_date,is_active,cooldown_hours,created_at)
  VALUES ('tok_wpepe','WorldPepe','WPEPE','🐸','WorldPepe Community Airdrop','Hold and earn WPEPE tokens daily',549029,75460,18300,30,500,now()+interval '30 days',true,24,now()-interval '10 days');
INSERT INTO airdrops (token_id,token_name,token_symbol,token_emoji,title,description,total_amount,claimed_amount,daily_amount,participants,max_participants,end_date,is_active,cooldown_hours,created_at)
  VALUES ('tok_orbcoin','OrbCoin','ORBC','🔮','OrbCoin Community Airdrop','Hold and earn ORBC tokens daily',205404,19289,6846,50,500,now()+interval '30 days',true,24,now()-interval '12 days');
INSERT INTO airdrops (token_id,token_name,token_symbol,token_emoji,title,description,total_amount,claimed_amount,daily_amount,participants,max_participants,end_date,is_active,cooldown_hours,created_at)
  VALUES ('tok_solara','Solara','SOLAR','☀️','Solara Community Airdrop','Hold and earn SOLAR tokens daily',462306,9258,15410,14,500,now()+interval '30 days',true,24,now()-interval '11 days');
INSERT INTO airdrops (token_id,token_name,token_symbol,token_emoji,title,description,total_amount,claimed_amount,daily_amount,participants,max_participants,end_date,is_active,cooldown_hours,created_at)
  VALUES ('tok_alpha','AlphaDAO','ALPHA','🧠','AlphaDAO Community Airdrop','Hold and earn ALPHA tokens daily',273550,61922,9118,43,500,now()+interval '30 days',true,24,now()-interval '10 days');
INSERT INTO airdrops (token_id,token_name,token_symbol,token_emoji,title,description,total_amount,claimed_amount,daily_amount,participants,max_participants,end_date,is_active,cooldown_hours,created_at)
  VALUES ('tok_fuego','Fuego','FUEG','🔥','Fuego Community Airdrop','Hold and earn FUEG tokens daily',275748,50364,9191,28,500,now()+interval '30 days',true,24,now()-interval '13 days');
INSERT INTO airdrops (token_id,token_name,token_symbol,token_emoji,title,description,total_amount,claimed_amount,daily_amount,participants,max_participants,end_date,is_active,cooldown_hours,created_at)
  VALUES ('tok_pixel','PixelWorld','PIXL','🎮','PixelWorld Community Airdrop','Hold and earn PIXL tokens daily',397785,40277,13259,56,500,now()+interval '30 days',true,24,now()-interval '8 days');

-- ─────────────────────────────────────────────
-- 7. TOKEN PAYMENTS (sample payment records)
-- ─────────────────────────────────────────────
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_seed_1001','usr_elena_08','buy','accepted',now()-interval '446 hours',now()-interval '46 hours')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_seed_1002','usr_pablo_11','buy','accepted',now()-interval '65 hours',now()-interval '98 hours')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_seed_1003','usr_lucia_20','buy','accepted',now()-interval '594 hours',now()-interval '13 hours')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_seed_1004','usr_diego_05','buy','accepted',now()-interval '47 hours',now()-interval '60 hours')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_seed_1005','usr_marco_17','buy','accepted',now()-interval '115 hours',now()-interval '211 hours')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_seed_1006','usr_luna_02','buy','accepted',now()-interval '282 hours',now()-interval '295 hours')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_seed_1007','usr_iris_14','buy','accepted',now()-interval '147 hours',now()-interval '84 hours')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_seed_1008','usr_diego_05','buy','accepted',now()-interval '120 hours',now()-interval '230 hours')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_seed_1009','usr_sara_18','buy','accepted',now()-interval '79 hours',now()-interval '97 hours')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_seed_1010','usr_max_03','buy','accepted',now()-interval '279 hours',now()-interval '3 hours')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_seed_1011','usr_pablo_11','buy','accepted',now()-interval '300 hours',now()-interval '225 hours')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_seed_1012','usr_pablo_11','buy','accepted',now()-interval '10 hours',now()-interval '34 hours')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_seed_1013','usr_nina_10','buy','accepted',now()-interval '54 hours',now()-interval '161 hours')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_seed_1014','usr_jake_09','buy','accepted',now()-interval '84 hours',now()-interval '64 hours')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_seed_1015','usr_val_16','buy','accepted',now()-interval '383 hours',now()-interval '245 hours')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_create_1016','usr_pgonia_01','create','accepted',now()-interval '21 days',now()-interval '21 days')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_create_1017','usr_pgonia_01','create','accepted',now()-interval '14 days',now()-interval '14 days')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_create_1018','usr_pgonia_01','create','accepted',now()-interval '25 days',now()-interval '25 days')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_create_1019','usr_pgonia_01','create','accepted',now()-interval '3 days',now()-interval '3 days')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_create_1020','usr_pgonia_01','create','accepted',now()-interval '18 days',now()-interval '18 days')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_create_1021','usr_luna_02','create','accepted',now()-interval '22 days',now()-interval '22 days')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_create_1022','usr_luna_02','create','accepted',now()-interval '7 days',now()-interval '7 days')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_create_1023','usr_max_03','create','accepted',now()-interval '20 days',now()-interval '20 days')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_create_1024','usr_max_03','create','accepted',now()-interval '10 days',now()-interval '10 days')
  ON CONFLICT (transaction_id) DO NOTHING;
INSERT INTO token_payments (transaction_id,user_id,action,status,verified_at,created_at)
  VALUES ('tx_create_1025','usr_sofia_04','create','accepted',now()-interval '15 days',now()-interval '15 days')
  ON CONFLICT (transaction_id) DO NOTHING;

-- ============================================================================
-- DONE. 21 users, 38 tokens, ~190 holdings, ~190 activities,
-- 304 price snapshots, 6 airdrops, 25 payment records.
-- ============================================================================
