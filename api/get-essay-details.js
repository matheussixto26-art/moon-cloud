// O código atual faz isso:
const details = {
    taskContent: response.data.taskContent, // Se response.data não tem taskContent, isso fica undefined
    supportText: response.data.supportText, // Isso também fica undefined
    // ...
};
// E no final, um objeto com valores undefined vira {}
res.status(200).json(details);
