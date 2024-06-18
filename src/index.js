import { Telegraf } from "telegraf";
import { message } from "telegraf/filters"

import dotenv from "dotenv";

import { handleError } from "./commands/index.js";
import lang from "./config/lang.js";
import { accountValid } from "./utils/checkVerify.js";
import { development, production } from "./core/index.js";
import prisma from "./config/prisma.js"
import keyboard from "./config/keyboard.js";

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN || "";
const ENVIRONMENT = process.env.NODE_ENV || "";

const bot = new Telegraf(BOT_TOKEN);

bot.start(async (ctx) => {
    const startPayload = ctx.payload;
    const language_code = ctx.from?.language_code === "fr" ? "fr" : "en";

    const user = await prisma.user.findUnique({
        where: {
            userId: ctx.from.id.toString()
        }
    })

    if (!user) {
        if (startPayload) {
            const userId = startPayload.slice(4);

            const inviter = await prisma.user.update({
                data: {
                    invitedUsers: {
                        increment: 1
                    },
                    amount: {
                        increment: 5500
                    }
                },
                where: {
                    userId: userId
                },
                select: {
                    userName: true
                }
            })

            await ctx.reply(`${ctx.from?.language_code === "fr" ? "Tu as été invitée par" : "You have been invited by"} ${inviter.userName} 🎉`);
        }

        await prisma.user.create({
            data: {
                userId: ctx.from.id.toString(),
                userName: ctx.from.first_name,
                lastBonusDate: new Date(2000, 11, 1)
            }
        })
    }

    const isAccountValid = await accountValid(ctx);

    if (!isAccountValid) {
        await ctx.reply(lang[language_code].start(ctx), {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "✅ S'inscrire", callback_data: `verify_${ctx.from.id}` }]
                ]
            },
            parse_mode: "HTML"
        });

        return;
    }

    if (isAccountValid) {
        await ctx.reply("Continue à partager ton lien pour gagner encore plus d’argent. 💰", {
            reply_markup: {
                keyboard: [
                    [{ text: "💰 Mon Solde 💰" }, { text: "Partager ↗️" }],
                    [{ text: "Bonus 🎁" }, { text: "🚩 Tâche" }],
                    [{ text: "Effectuer un Retrait 🏦" }],
                    [{ text: "📌 Ajoutez un numéro" }, { text: "📋 Procédure 📋" }]
                ],
                resize_keyboard: true
            }
        });
    }

});


bot.command("channel", async (ctx) => {
    console.log(ctx.message.reply_to_message.forward_origin.chat.id)
})

bot.on(message("text"), async (ctx) => {
    const text = ctx.message.text;
    const language_code = ctx.from?.language_code === "fr" ? "fr" : "en";

    const user = await prisma.user.findUnique({
        where: {
            userId: ctx.from.id.toString()
        }
    })

    if (text === "Bonus 🎁") {
        // Calculer la différence en millisecondes
        let difference = new Date() - new Date(user.lastBonusDate);

        // Convertir la différence en heures
        let differenceInHours = difference / 1000 / 60 / 60;

        // Vérifier si la différence est égale à 3 heure
        if (differenceInHours >= 2) {
            await prisma.user.update({
                where: {
                    userId: ctx.from.id.toString()
                },
                data: {
                    amount: {
                        increment: 750,
                    },
                    lastBonusDate: new Date()
                }
            })

            await ctx.reply(lang[language_code].win);
        } else {
            // Définir l'heure donnée et l'heure actuelle
            let givenTime = new Date(user.lastBonusDate);
            let currentTime = new Date();

            // Ajouter 3 heure ( 3 * 3600000 millisecondes) à l'heure donnée
            let timePlusThreeHour = new Date(givenTime.getTime() + (3600000 * 2));

            // Calculer la différence en millisecondes
            let timeRemaining = timePlusThreeHour - currentTime;

            // Convertir la différence en minutes et secondes
            let hoursRemaining = Math.floor((timeRemaining / (1000 * 60 * 60)) % 24);
            let minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
            let secondsRemaining = Math.floor((timeRemaining % (1000 * 60)) / 1000);

            await ctx.reply(lang[language_code].bonus(hoursRemaining, minutesRemaining, secondsRemaining), {
                reply_markup: {
                    keyboard: [
                        [{ text: "💰 Mon Solde 💰" }, { text: "Partager ↗️" }],
                        [{ text: "Bonus 🎁" }, { text: "🚩 Tâche" }],
                        [{ text: "Effectuer un Retrait 🏦" }],
                        [{ text: "📌 Ajoutez un numéro" }, { text: "📋 Procédure 📋" }]
                    ],
                    resize_keyboard: true
                }
            });
        }
        return;
    }

    if (text === "📌 Ajoutez un numéro" || text === "📌 Add a Number") {
        await ctx.reply(lang[language_code].settings(user), {
            reply_markup: {
                inline_keyboard: keyboard[language_code].settings(ctx)
            }
        })

        return;
    }

    if (text === "💰 Mon Solde 💰" || text === "💰 My Balance 💰") {
        await ctx.reply(lang[language_code].account(user), {
            reply_markup: {
                keyboard: [
                    [{ text: "💰 Mon Solde 💰" }, { text: "Partager ↗️" }],
                    [{ text: "Bonus 🎁" }, { text: "🚩 Tâche" }],
                    [{ text: "Effectuer un Retrait 🏦" }],
                    [{ text: "📌 Ajoutez un numéro" }, { text: "📋 Procédure 📋" }]
                ],
                resize_keyboard: true
            }
        })

        return;
    }

    if (text === "Partager ↗️" || text === "Share ↗️") {
        await ctx.reply(lang[language_code].share(ctx, user), {
            reply_markup: {
                keyboard: [
                    [{ text: "💰 Mon Solde 💰" }, { text: "Partager ↗️" }],
                    [{ text: "Bonus 🎁" }, { text: "🚩 Tâche" }],
                    [{ text: "Effectuer un Retrait 🏦" }],
                    [{ text: "📌 Ajoutez un numéro" }, { text: "📋 Procédure 📋" }]
                ],
                resize_keyboard: true
            }
        });

        return;
    }

    if (text === "📋 Procédure 📋" || text === "📋 Procedure 📋") {
        await ctx.reply(lang[language_code].procedure, {
            reply_markup: {
                keyboard: [
                    [{ text: "💰 Mon Solde 💰" }, { text: "Partager ↗️" }],
                    [{ text: "Bonus 🎁" }, { text: "🚩 Tâche" }],
                    [{ text: "Effectuer un Retrait 🏦" }],
                    [{ text: "📌 Ajoutez un numéro" }, { text: "📋 Procédure 📋" }]
                ],
                resize_keyboard: true
            }
        });

        return;
    }

    if (text === "Effectuer un Retrait 🏦" || text === "Make a Withdrawal 🏦") {
        if (user.amount < 40000) {
            await ctx.reply(lang[language_code].min(user.amount));

            return;
        }
        if (!user.accountNumber) {
            await ctx.reply(lang[language_code].num);

            return;
        }

        await prisma.user.update({
            where: {
                userId: ctx.from.id.toString()
            },
            data: {
                status: "withdraw"
            }
        })

        await ctx.reply(lang[language_code].withdrawEx);

        return;
    }

    if (text === "🚩 Tâche" || text === "🚩 Task") {
        const completedTasks = await prisma.userTasks.findMany({
            where: {
                userId: ctx.from.id.toString()
            },
            select: {
                taskId: true
            }
        })

        if (completedTasks.length >= 2) {
            await ctx.reply(lang[language_code].taskUnavailable);

            return;
        }

        const completedTasksId = completedTasks.map((task) => task.taskId)

        const availableTasks = await prisma.task.findMany({
            where: {
                NOT: {
                    id: {
                        in: completedTasksId
                    }
                }
            },
            orderBy: {
                priority: "desc"
            },
            take: 2
        })


        const displayTasks = availableTasks.reduce((curVal, task) => {
            return curVal + `\n\n👉 ${task.link}\n💸 Gains: ${task.reward} FCFA`
        }, "")

        const callback_data = availableTasks.reduce((curVal, task) => {
            return curVal + `_${task.id}`
        }, "task")

        await ctx.reply(lang[language_code].taskIntro);
        await ctx.reply(`${lang[language_code].taskMain}:${displayTasks}\n\n${language_code === "fr" ? "Terminé" : "Done"}: ${2 - availableTasks.length}/2`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "✅ Check", callback_data }]
                ]
            },
            link_preview_options: {
                is_disabled: true
            }
        })
    }

    if (user?.status === "AddingNum") {
        await prisma.user.update({
            where: {
                userId: ctx.from.id.toString()
            },
            data: {
                accountNumber: text,
                status: "Idle"
            }
        })

        await ctx.reply(lang[language_code].newNum, {
            reply_markup: {
                keyboard: keyboard[language_code].main
            }
        });

        return;
    }

    if (user?.status === "withdraw" && Boolean(parseInt(text))) {
        const withdrawAmount = parseInt(text);

        if (withdrawAmount > user.amount) {
            await ctx.reply(lang[language_code].insufficiant + user.amount + "FCFA.");

            return;
        }

        if (withdrawAmount < 40000) {
            await ctx.reply(lang[language_code].minText);

            return;
        }

        if (user.invitedUsers < 5) {
            await ctx.reply(lang[language_code].minUsers(user.userName, user.invitedUsers), {
                parse_mode: "HTML"
            });

            return;
        }

        await ctx.reply(lang[language_code].withdraw);

        await prisma.user.update({
            where: {
                userId: ctx.from.id.toString()
            },
            data: {
                status: "Idle",
                hasWithdrawn: true,
                amount: {
                    decrement: withdrawAmount
                }
            }
        });

        const REACTIONS = [
            {
                emoji: "👍",
                type: "emoji"
            },
            {
                emoji: "🔥",
                type: "emoji"
            },
            {
                emoji: "🎉",
                type: "emoji"
            },
            {
                emoji: "❤",
                type: "emoji"
            }
        ];
        const randomNumber = Math.floor(Math.random() * 4);

        const message = await ctx.telegram.sendMessage("-1002240023653", `⚔ NOUVEAU RETRAIT ⚔\n\n▪️ Status : Approuvé ✅\n▪️ User Identifiant: ${ctx.from.id}\n▪️ Retrait effectué par: ${user.userName}\n▪️ Montant Retiré : ${withdrawAmount} FCFA\n\n🤴 Bot @${ctx.botInfo.username}`, {
            disable_notification: true
        });
        await ctx.telegram.setMessageReaction("-1002240023653", message.message_id, [REACTIONS[randomNumber]])
    }

})

bot.on("chat_join_request", async (ctx) => {
    const user = await prisma.user.findUnique({
        where: {
            userId: ctx.chatJoinRequest.from?.id.toString()
        }
    })

    if (!user) return;

    const taskId = await prisma.task.findFirst({
        where: {
            chatId: ctx.chatJoinRequest?.chat?.id.toString()
        },
        select: {
            id: true
        }
    })

    await prisma.userTasks.create({
        data: {
            userId: ctx.from.id.toString(),
            taskId: taskId.id
        }
    })
})

bot.on("callback_query", async (ctx) => {
    const callback_data = ctx.callbackQuery.data;

    const command = callback_data.split("_")[0];

    console.log("callback_data", callback_data)

    const language_code = ctx.from?.language_code === "fr" ? "fr" : "en";

    if (command === "verify") {
        const isAccountValid = await accountValid(ctx);

        if (!isAccountValid) {
            await ctx.reply(lang[language_code].invalid);
            return;
        }


        await ctx.reply(lang[language_code].welcome, {
            reply_markup: {
                keyboard: keyboard[language_code].main,
                resize_keyboard: true
            }
        });

    }

    if (command === "addNum") {
        await ctx.reply(lang[language_code].getNum);

        await prisma.user.update({
            where: {
                userId: ctx.from.id.toString()
            },
            data: {
                status: "AddingNum"
            }
        })
    }

    if (command === "task") {
        const completedTasksId = [];
        const uncompletedTasksId = [];
        const availableTasks = [];

        for (const payload of callback_data.split("_").slice(1)) {
            const task = await prisma.task.findUnique({
                where: {
                    id: payload
                }
            })

            console.log("Task", task)

            availableTasks.push(task);

            let done = false;

            if (payload.slice(2, 4) == "11") {
                done = await prisma.userTasks.findFirst({
                    where: {
                        userId: ctx.from.id.toString(),
                        taskId: payload
                    }
                })
            }

            if (payload.slice(2, 4) == "22") {
                const user = await ctx.telegram.getChatMember(task.chatId, ctx.from.id);
                console.log("User", user)
                done = !(user.status === "left" || user.status === "kicked");
                console.log("done", done)

                if (done) {
                    await prisma.userTasks.create({
                        data: {
                            userId: ctx.from.id.toString(),
                            taskId: payload
                        }
                    })
                }
            }

            if (done) {
                completedTasksId.push(task.id);

                await prisma.user.update({
                    where: {
                        userId: ctx.from.id.toString()
                    },
                    data: {
                        amount: {
                            increment: task.reward
                        }
                    }
                })
            } else {
                uncompletedTasksId.push(task.id)
            }
        }


        if (completedTasksId.length === 0) {
            await ctx.answerCbQuery(lang[language_code].taskAlert)

            return;
        }

        if (completedTasksId.length === callback_data.split("_").slice(1).length) {
            await ctx.deleteMessage();

            await ctx.reply(lang[language_code].taskDone)

            return;
        }

        const displayTasks = availableTasks.filter((task) => !completedTasksId.includes(task.id)).reduce((curVal, task) => {
            return curVal + `\n\n👉 ${task.link}\n💸 Gains: ${task.reward} FCFA`
        }, "")

        const command = uncompletedTasksId.reduce((curVal, taskId) => {
            return curVal + `_${taskId}`
        }, "task")

        await ctx.telegram.editMessageText(ctx.chat.id, ctx.callbackQuery.message.message_id, undefined, `${lang[language_code].taskMain}: ${displayTasks}\n\n${language_code === "fr" ? "Terminé" : "Done"}: ${completedTasksId.length}/2`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "✅ Check", callback_data: command }]
                ]
            },
            link_preview_options: {
                is_disabled: true
            }
        })
    }

});

bot.catch(handleError);

export const startVercel = async (req, res) => {
    await production(req, res, bot);
};

//dev mode

ENVIRONMENT !== "production" && development(bot);
