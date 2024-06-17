const development = async (bot) => {
    await bot.telegram.deleteWebhook();

    await bot.launch(() => {
        console.log("Bot Started !!")
    });

    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));

    process.on("uncaughtException", (err) => {
        console.log(err);
    });
};

export { development };
